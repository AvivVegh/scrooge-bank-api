import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { AccountEntity, AccountStatus } from '../entities/account.entity';
import { BankLedgerEntity, BankLedgerKind } from '../entities/bank-ledger.entity';
import { LoanEntity, LoanStatus } from '../entities/loan.entity';
import { TransactionEntity, TransactionType } from '../entities/transaction.entity';
import { convertToCents } from '../lib/utils';
import { AccountStatementResultDto } from './dto/account-statement-result.dto';
import { DepositResultDto } from './dto/deposit-result.dto';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(AccountEntity)
    private accountsRepository: Repository<AccountEntity>,
  ) {}

  async create({ userId }: { userId: string }) {
    this.logger.log(`Creating account for user: ${userId}`);

    // Check if account of this type already exists for the user
    const existingAccount = await this.accountsRepository.findOne({
      where: { userId },
    });

    if (existingAccount) {
      this.logger.warn(`Account already exists for user: ${userId}`);
      throw new ConflictException(`Account already exists for this user`);
    }

    // Create new account
    const account = this.accountsRepository.create({
      userId,
      balanceCents: 0,
      status: AccountStatus.OPEN,
    });

    const savedAccount = await this.accountsRepository.save(account);
    this.logger.log(`Account created successfully: ${savedAccount.id} for user: ${userId}`);
    return savedAccount;
  }

  async findByUserId({ accountId }: { accountId: string }) {
    this.logger.log(`Finding account: ${accountId}`);

    const account = await this.accountsRepository.findOne({
      where: { id: accountId, status: AccountStatus.OPEN },
    });

    if (!account) {
      this.logger.warn(`Account not found: ${accountId}`);
      throw new NotFoundException('Account not found');
    }

    this.logger.log(`Account found: ${accountId}`);
    return account;
  }

  async findAllAccounts({ userId }: { userId: string }) {
    this.logger.log(`Finding all accounts for user: ${userId}`);

    const accounts = await this.accountsRepository.find({
      where: { status: AccountStatus.OPEN, userId },
    });

    this.logger.log(`Found ${accounts.length} accounts for user: ${userId}`);
    return accounts;
  }

  async getAccountStatement({
    accountId,
    fromDate,
    toDate,
  }: {
    accountId: string;
    fromDate: Date;
    toDate: Date;
  }): Promise<AccountStatementResultDto> {
    this.logger.log(
      `Generating statement for account: ${accountId} from ${fromDate.toISOString()} to ${toDate.toISOString()}`,
    );

    return this.dataSource.transaction(async transaction => {
      const account = await transaction.getRepository(AccountEntity).findOne({
        where: { id: accountId, status: AccountStatus.OPEN },
      });

      if (!account) {
        this.logger.warn(`Account not found for statement: ${accountId}`);
        throw new NotFoundException('Account not found');
      }

      const loans = await transaction.getRepository(LoanEntity).find({
        where: { userId: account.userId, status: LoanStatus.APPROVED },
      });

      const transactions = await transaction.getRepository(TransactionEntity).find({
        where: { account: { id: accountId }, createdAt: Between(fromDate, toDate) },
      });

      const balance = account.balanceCents / 100;

      this.logger.log(
        `Statement generated for account: ${accountId}, transactions: ${transactions.length}, loans: ${loans.length}`,
      );

      return {
        balance,
        loans,
        transactions,
      } as AccountStatementResultDto;
    });
  }

  async closeAccount({ userId, accountId }: { userId: string; accountId: string }) {
    this.logger.log(`Attempting to close account: ${accountId} for user: ${userId}`);

    return this.dataSource.transaction(async transaction => {
      const account = await transaction.getRepository(AccountEntity).findOne({
        where: { id: accountId, status: AccountStatus.OPEN },
      });

      if (!account) {
        this.logger.warn(`Account not found for closure: ${accountId}`);
        throw new NotFoundException('Account not found');
      }

      const loans = await transaction.getRepository(LoanEntity).find({
        where: { userId, status: LoanStatus.APPROVED },
      });

      if (loans.length > 0) {
        this.logger.warn(`Cannot close account ${accountId}: has ${loans.length} active loans`);
        throw new BadRequestException('Account has loans and cannot be closed');
      }

      if (account.balanceCents > 0) {
        this.logger.warn(
          `Cannot close account ${accountId}: has balance of ${account.balanceCents} cents`,
        );
        throw new BadRequestException('Account has money and cannot be closed');
      }

      account.status = AccountStatus.CLOSED;
      account.closedAt = new Date();
      const closedAccount = await transaction.getRepository(AccountEntity).save(account);
      this.logger.log(`Account closed successfully: ${accountId}`);
      return closedAccount;
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
    this.logger.log(
      `Deposit request: ${amount} to account ${accountId} by user ${userId}${idempotencyKey ? ` with idempotency key: ${idempotencyKey}` : ''}`,
    );

    if (amount <= 0) {
      this.logger.warn(`Invalid deposit amount: ${amount} for account ${accountId}`);
      throw new BadRequestException('Amount must be greater than 0');
    }

    const amountCents = convertToCents(amount);

    const result = await this.processTransaction({
      userId,
      accountId,
      amountCents,
      idempotencyKey,
      transactionType: TransactionType.DEPOSIT,
      bankLedgerKind: BankLedgerKind.DEPOSIT,
      balanceModifier: (balance, amount) => balance + amount,
    });

    this.logger.log(
      `Deposit completed: ${amount} to account ${accountId}, new balance: ${result.newBalanceCents / 100}`,
    );
    return result;
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
    this.logger.log(
      `Withdrawal request: ${amount} from account ${accountId} by user ${userId}${idempotencyKey ? ` with idempotency key: ${idempotencyKey}` : ''}`,
    );

    if (amount <= 0) {
      this.logger.warn(`Invalid withdrawal amount: ${amount} for account ${accountId}`);
      throw new BadRequestException('Amount must be greater than 0');
    }

    const amountCents = convertToCents(amount);

    const result = await this.processTransaction({
      userId,
      accountId,
      amountCents,
      idempotencyKey,
      transactionType: TransactionType.WITHDRAWAL,
      bankLedgerKind: BankLedgerKind.WITHDRAWAL,
      balanceModifier: (balance, amount) => balance - amount,
      additionalValidations: account => {
        if (account.balanceCents < amountCents) {
          this.logger.warn(
            `Insufficient funds for withdrawal: account ${accountId}, balance: ${account.balanceCents}, requested: ${amountCents}`,
          );
          throw new BadRequestException('Insufficient funds');
        }
      },
      ledgerAmountCents: -amountCents, // For withdrawals, we store negative amount in ledger
    });

    this.logger.log(
      `Withdrawal completed: ${amount} from account ${accountId}, new balance: ${result.newBalanceCents / 100}`,
    );
    return result;
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
      this.logger.debug(
        `Processing transaction: type=${transactionType}, amount=${amountCents}, account=${accountId}`,
      );

      // 1) Load & lock account; verify ownership + 'open'
      const account = await transaction.getRepository(AccountEntity).findOne({
        where: { id: accountId, userId, status: AccountStatus.OPEN },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        this.logger.warn(`Account not found in processTransaction: ${accountId}`);
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
          this.logger.log(
            `Idempotency key already used: ${idempotencyKey}, returning existing transaction: ${existing.id}`,
          );
          // Guard: same key used for a different operation/amount? -> 409
          if (existing.type !== transactionType || existing.amountCents !== amountCents) {
            this.logger.warn(
              `Idempotency key conflict: ${idempotencyKey}, different operation/amount`,
            );
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
        this.logger.debug(`Transaction entity created: ${tx.id}`);
      } catch (e: unknown) {
        if (
          e &&
          typeof e === 'object' &&
          'code' in e &&
          (e as { code: string }).code === '23505' &&
          idempotencyKey
        ) {
          this.logger.log(`Duplicate idempotency key detected on save: ${idempotencyKey}`);
          // Unique (account_id, idempotency_key) violated — fetch and reconcile
          const dup = await transaction.getRepository(TransactionEntity).findOne({
            where: { account: { id: accountId }, idempotencyKey },
          });
          if (dup && dup.type === transactionType && dup.amountCents === amountCents) {
            this.logger.log(`Returning duplicate transaction: ${dup.id}`);
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
          this.logger.warn(`Idempotency key mismatch on duplicate: ${idempotencyKey}`);
          throw new ConflictException(
            'Idempotency key already used with a different operation/amount',
          );
        }
        this.logger.error(
          `Error creating transaction: ${e instanceof Error ? e.message : String(e)}`,
        );
        throw e;
      }

      // 5) Apply balance change
      const oldBalance = account.balanceCents;
      account.balanceCents = balanceModifier(account.balanceCents, amountCents);
      await transaction.getRepository(AccountEntity).save(account);
      this.logger.debug(`Balance updated: ${oldBalance} -> ${account.balanceCents}`);

      // 6) Append ledger entry
      await transaction.getRepository(BankLedgerEntity).save({
        kind: bankLedgerKind,
        amountCents: ledgerAmountCents ?? amountCents,
        transaction: { id: tx.id },
      });

      this.logger.debug(
        `Transaction completed successfully: ${tx.id}, new balance: ${account.balanceCents}`,
      );

      return {
        transactionId: tx.id,
        accountId,
        newBalanceCents: account.balanceCents,
        createdAt: tx.createdAt,
      } as DepositResultDto;
    });
  }
}
