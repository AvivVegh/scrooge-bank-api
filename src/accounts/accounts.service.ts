import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { BankLedgerEntity, BankLedgerKind } from 'src/entities/bank-ledger.entity';
import { LoanEntity, LoanStatus } from 'src/entities/loan.entity';
import { TransactionEntity, TransactionType } from 'src/entities/transaction.entity';
import { DataSource, Repository } from 'typeorm';
import { AccountEntity, AccountStatus } from '../entities/account.entity';
import { convertToCents } from '../lib/utils';
import { DepositResultDto } from './dto/deposit-result.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(AccountEntity)
    private accountsRepository: Repository<AccountEntity>,
    @InjectRepository(TransactionEntity)
    private transactionsRepository: Repository<TransactionEntity>,
    @InjectRepository(BankLedgerEntity)
    private bankLedgerRepository: Repository<BankLedgerEntity>,
    @InjectRepository(LoanEntity)
    private loansRepository: Repository<LoanEntity>,
  ) {}

  async create({ userId }: { userId: string }) {
    // Check if account of this type already exists for the user
    const existingAccount = await this.accountsRepository.findOne({
      where: { userId },
    });

    if (existingAccount) {
      throw new ConflictException(`Account already exists for this user`);
    }

    // Create new account
    const account = this.accountsRepository.create({
      userId,
      balanceCents: 0,
      status: AccountStatus.OPEN,
    });

    return await this.accountsRepository.save(account);
  }

  async findByUserId({ accountId }: { accountId: string }) {
    const account = await this.accountsRepository.findOne({
      where: { id: accountId, status: AccountStatus.OPEN },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async findAllAccounts({ userId }: { userId: string }) {
    return this.accountsRepository.find({
      where: { status: AccountStatus.OPEN, userId },
    });
  }

  async closeAccount({ userId, accountId }: { userId: string; accountId: string }) {
    return this.dataSource.transaction(async transaction => {
      const account = await transaction.getRepository(AccountEntity).findOne({
        where: { id: accountId, status: AccountStatus.OPEN },
      });

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      const loans = await transaction.getRepository(LoanEntity).find({
        where: { userId, status: LoanStatus.APPROVED },
      });

      if (loans.length > 0) {
        throw new BadRequestException('Account has loans and cannot be closed');
      }

      if (account.balanceCents > 0) {
        throw new BadRequestException('Account has money and cannot be closed');
      }

      account.status = AccountStatus.CLOSED;
      account.closedAt = new Date();
      return await transaction.getRepository(AccountEntity).save(account);
    });
  }

  async deposit({
    userId,
    accountId,
    amount,
    idempotencyKey,
  }: {
    userId: string;
    accountId: string;
    amount: number;
    idempotencyKey?: string;
  }): Promise<DepositResultDto> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const amountCents = convertToCents(amount);

    return this.processTransaction({
      userId,
      accountId,
      amountCents,
      idempotencyKey,
      transactionType: TransactionType.DEPOSIT,
      bankLedgerKind: BankLedgerKind.DEPOSIT,
      balanceModifier: (balance, amount) => balance + amount,
    });
  }

  async withdraw({
    accountId,
    amount,
    userId,
    idempotencyKey,
  }: {
    accountId: string;
    amount: number;
    userId: string;
    idempotencyKey?: string;
  }): Promise<DepositResultDto> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const amountCents = convertToCents(amount);

    return this.processTransaction({
      userId,
      accountId,
      amountCents,
      idempotencyKey,
      transactionType: TransactionType.WITHDRAWAL,
      bankLedgerKind: BankLedgerKind.WITHDRAWAL,
      balanceModifier: (balance, amount) => balance - amount,
      additionalValidations: account => {
        if (account.balanceCents < amountCents) {
          throw new BadRequestException('Insufficient funds');
        }
      },
      ledgerAmountCents: -amountCents, // For withdrawals, we store negative amount in ledger
    });
  }

  private async processTransaction({
    userId,
    accountId,
    amountCents,
    idempotencyKey,
    transactionType,
    bankLedgerKind,
    balanceModifier,
    additionalValidations,
    ledgerAmountCents,
  }: {
    userId: string;
    accountId: string;
    amountCents: number;
    idempotencyKey?: string;
    transactionType: TransactionType;
    bankLedgerKind: BankLedgerKind;
    balanceModifier: (balance: number, amount: number) => number;
    additionalValidations?: (account: AccountEntity) => void;
    ledgerAmountCents?: number;
  }): Promise<DepositResultDto> {
    return this.dataSource.transaction(async transaction => {
      // 1) Load & lock account; verify ownership + 'open'
      const account = await transaction.getRepository(AccountEntity).findOne({
        where: { id: accountId, userId, status: AccountStatus.OPEN },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      // 2) Run additional validations (e.g., loan account check, insufficient funds)
      if (additionalValidations) {
        additionalValidations(account);
      }

      // 3) Idempotency check (return same result if key already used)
      if (idempotencyKey) {
        const existing = await transaction.getRepository(TransactionEntity).findOne({
          where: { account: { id: accountId }, idempotencyKey },
        });

        if (existing) {
          // Guard: same key used for a different operation/amount? -> 409
          if (existing.type !== transactionType || existing.amountCents !== amountCents) {
            throw new ConflictException(
              'Idempotency key already used with a different operation/amount',
            );
          }
          const fresh = await transaction
            .getRepository(AccountEntity)
            .findOneByOrFail({ id: accountId });
          return {
            transactionId: existing.id,
            accountId,
            newBalanceCents: fresh.balanceCents,
            createdAt: existing.createdAt,
          } as DepositResultDto;
        }
      }

      // 4) Create Transaction first (so idempotency never double-processes on race)
      let tx: TransactionEntity;
      try {
        tx = await transaction.getRepository(TransactionEntity).save({
          account: { id: accountId },
          type: transactionType,
          amountCents: amountCents,
          idempotencyKey,
          createdByUserId: userId,
        });
      } catch (e: unknown) {
        if (
          e &&
          typeof e === 'object' &&
          'code' in e &&
          (e as { code: string }).code === '23505' &&
          idempotencyKey
        ) {
          // Unique (account_id, idempotency_key) violated — fetch and reconcile
          const dup = await transaction.getRepository(TransactionEntity).findOne({
            where: { account: { id: accountId }, idempotencyKey },
          });
          if (dup && dup.type === transactionType && dup.amountCents === amountCents) {
            const fresh = await transaction
              .getRepository(AccountEntity)
              .findOneByOrFail({ id: accountId });
            return {
              transactionId: dup.id,
              accountId,
              newBalanceCents: fresh.balanceCents,
              createdAt: dup.createdAt,
            } as DepositResultDto;
          }
          throw new ConflictException(
            'Idempotency key already used with a different operation/amount',
          );
        }
        throw e;
      }

      // 5) Apply balance change
      account.balanceCents = balanceModifier(account.balanceCents, amountCents);
      await transaction.getRepository(AccountEntity).save(account);

      // 6) Append ledger entry
      await transaction.getRepository(BankLedgerEntity).save({
        kind: bankLedgerKind,
        amountCents: ledgerAmountCents ?? amountCents,
        transaction: { id: tx.id },
      });

      return {
        transactionId: tx.id,
        accountId,
        newBalanceCents: account.balanceCents,
        createdAt: tx.createdAt,
      } as DepositResultDto;
    });
  }
}
