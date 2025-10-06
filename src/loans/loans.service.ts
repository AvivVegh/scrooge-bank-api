import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AccountEntity, AccountStatus } from '../entities/account.entity';
import { BankLedgerEntity, BankLedgerKind } from '../entities/bank-ledger.entity';
import { LoanDisbursementEntity } from '../entities/loan-disbursement.entity';
import { LoanPaymentEntity } from '../entities/loan-payment.entity';
import { LoanEntity, LoanStatus } from '../entities/loan.entity';
import { TransactionEntity, TransactionType } from '../entities/transaction.entity';
import { convertToCents } from '../lib/utils';
import { ApplyLoanResultDto } from './dto/loan-apply-result.dto';
import { LoanPaymentResultDto } from './dto/loan-payment-result.dto';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);
  private static readonly ADVISORY_LOCK_ID = 42;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(LoanEntity) private readonly loanRepo: Repository<LoanEntity>,
  ) {}

  async getLoans({ userId }: { userId: string }): Promise<LoanEntity[]> {
    this.logger.log(`Getting loans for user: ${userId}`);

    const loans = await this.loanRepo.find({ where: { userId } });

    this.logger.log(`Found ${loans.length} loans for user: ${userId}`);
    return loans;
  }

  async applyForLoan({
    userId,
    amount,
    idemKey,
  }: {
    userId: string;
    amount: number;
    idemKey?: string;
  }): Promise<ApplyLoanResultDto> {
    this.logger.log(
      `Loan application: user=${userId}, amount=${amount}${idemKey ? `, idempotencyKey=${idemKey}` : ''}`,
    );

    const amountCents = convertToCents(amount);

    return this.ds.transaction(async m => {
      this.logger.debug('Acquiring advisory lock for loan approval');
      await m.query('SELECT pg_advisory_xact_lock($1)', [LoansService.ADVISORY_LOCK_ID]);

      const account = await m.getRepository(AccountEntity).findOne({
        where: { userId, status: AccountStatus.OPEN },
      });

      if (!account) {
        this.logger.warn(`Loan application rejected: user ${userId} has no open account`);
        throw new NotFoundException('User must have an open account to apply for loans');
      }

      if (idemKey) {
        const existing = await m
          .getRepository(LoanEntity)
          .findOne({ where: { userId, clientKey: idemKey } });
        if (existing) {
          this.logger.log(
            `Idempotency key found: ${idemKey}, returning existing loan: ${existing.id}`,
          );
          if (existing.principalCents !== amountCents) {
            this.logger.warn(`Idempotency key conflict: ${idemKey}, different amount`);
            throw new ConflictException('Idempotency key reused with a different amount');
          }
          // hydrate associated disbursement if approved
          if (existing.status === LoanStatus.APPROVED) {
            const disb = await m
              .getRepository(LoanDisbursementEntity)
              .findOne({ where: { loan: { id: existing.id } } });
            return {
              loanId: existing.id,
              status: existing.status,
              principalCents: existing.principalCents,
              disbursementId: disb?.id ?? null,
              decisionAt: existing.decisionAt ?? existing.createdAt,
            } as ApplyLoanResultDto;
          }
          return {
            loanId: existing.id,
            status: existing.status,
            principalCents: existing.principalCents,
            reason: existing.reason ?? null,
            decisionAt: existing.decisionAt ?? existing.createdAt,
          } as ApplyLoanResultDto;
        }
      }

      // Compute availability from ledger (snapshot inside this tx)

      const queryResult = await m.query(`
        SELECT
          COALESCE(SUM(CASE WHEN kind='base_cash'      THEN amount_cents END), 0) AS base_cash,
          COALESCE(SUM(CASE WHEN kind='deposit'        THEN amount_cents END), 0) AS deposits_sum,
          COALESCE(SUM(CASE WHEN kind='withdrawal'     THEN amount_cents END), 0) AS withdrawals_sum,
          COALESCE(SUM(CASE WHEN kind='loan_disbursed' THEN amount_cents END), 0) AS disbursed_sum,
          COALESCE(SUM(CASE WHEN kind='loan_payment'   THEN amount_cents END), 0) AS payments_sum
        FROM bank_ledger
      `);

      const row = queryResult[0];

      const baseCash = parseInt(row.base_cash, 10);

      // withdrawals are negative

      const depositsOnHand = parseInt(row.deposits_sum, 10) + parseInt(row.withdrawals_sum, 10);

      // up to 25% of deposits
      const loanableFromDeposits = depositsOnHand > 0 ? Math.floor(depositsOnHand / 4) : 0;

      // disbursed_sum is negative in ledger

      const drawn = -parseInt(row.disbursed_sum, 10);

      const repaid = parseInt(row.payments_sum, 10);
      const outstanding = drawn - repaid;
      const available = baseCash + loanableFromDeposits - outstanding;

      this.logger.debug(
        `Bank funds calculation: baseCash=${baseCash}, depositsOnHand=${depositsOnHand}, ` +
          `loanableFromDeposits=${loanableFromDeposits}, outstanding=${outstanding}, ` +
          `available=${available}, requested=${amount}`,
      );

      if (amount <= available) {
        this.logger.log(`Loan APPROVED: user=${userId}, amount=${amount}, available=${available}`);
        const loan = await m.getRepository(LoanEntity).save({
          userId,
          principalCents: amountCents,
          status: LoanStatus.APPROVED,
          clientKey: idemKey,
          decisionAt: new Date(),
        });

        const disb = await m.getRepository(LoanDisbursementEntity).save({
          loan: { id: loan.id },
          amountCents: amountCents,
        });

        await m.getRepository(BankLedgerEntity).save({
          kind: BankLedgerKind.LOAN_DISBURSED,
          amountCents: -amountCents,
          loanDisbursement: { id: disb.id },
        });

        this.logger.log(`Loan disbursed: loanId=${loan.id}, disbursementId=${disb.id}`);

        return {
          loanId: loan.id,
          status: LoanStatus.APPROVED,
          principalCents: loan.principalCents,
          disbursementId: disb.id,
          decisionAt: loan.decisionAt,
        } as ApplyLoanResultDto;
      } else {
        this.logger.warn(
          `Loan REJECTED: user=${userId}, amount=${amount}, available=${available}, reason=insufficient_bank_funds`,
        );
        const loan = await m.getRepository(LoanEntity).save({
          userId,
          principalCents: amountCents,
          status: LoanStatus.REJECTED,
          reason: 'insufficient_bank_funds',
          clientKey: idemKey,
          decisionAt: new Date(),
        });
        return {
          loanId: loan.id,
          status: LoanStatus.REJECTED,
          reason: 'insufficient_bank_funds',
          principalCents: loan.principalCents,
          disbursementId: null,
          decisionAt: loan.decisionAt,
        } as ApplyLoanResultDto;
      }
    });
  }

  async loanPayment({
    userId,
    amount,
    loanId,
    paymentId,
    fromAccountId,
  }: {
    userId: string;
    amount: number;
    loanId: string;
    paymentId: string;
    fromAccountId: string;
  }): Promise<LoanPaymentResultDto> {
    this.logger.log(
      `Loan payment: loanId=${loanId}, paymentId=${paymentId}, amount=${amount}, fromAccount=${fromAccountId}, user=${userId}`,
    );

    const amountCents = convertToCents(amount);
    return this.ds.transaction(async m => {
      this.logger.debug(`Acquiring advisory lock for loan payment: ${loanId}`);
      await m.query('SELECT pg_advisory_xact_lock($1, hashtext($2))', [1, loanId]);

      const existing = await m
        .getRepository(LoanPaymentEntity)
        .findOne({ where: { id: paymentId } });
      if (existing) {
        this.logger.log(`Payment already exists: ${paymentId}, returning existing record`);
        const { due } = await this.calcDue(m, loanId);
        return {
          paymentId: existing.id,
          loanId,
          amountCents: existing.amountCents,
          remainingCents: due,
          occurredAt: existing.createdAt,
        } as LoanPaymentResultDto;
      }

      // Load + lock loan and compute due
      const loan = await m
        .getRepository(LoanEntity)
        .createQueryBuilder('l')
        .setLock('pessimistic_write')
        .where('l.id = :id AND l.userId = :uid', { id: loanId, uid: userId })
        .getOne();
      if (!loan) {
        this.logger.warn(`Loan not found: ${loanId} for user ${userId}`);
        throw new NotFoundException('Loan not found');
      }
      if (loan.status === LoanStatus.CLOSED) {
        this.logger.warn(`Cannot pay closed loan: ${loanId}`);
        throw new ForbiddenException('Loan already closed');
      }

      const { due } = await this.calcDue(m, loanId);
      this.logger.debug(`Loan ${loanId} due: ${due}, payment amount: ${amountCents}`);

      if (amount > due) {
        this.logger.warn(`Overpayment attempted on loan ${loanId}: amount=${amount}, due=${due}`);
        throw new BadRequestException('Overpayment not allowed');
      }

      // INTERNAL: withdraw from checking
      const acct = await m
        .getRepository(AccountEntity)
        .createQueryBuilder('a')
        .setLock('pessimistic_write')
        .where('a.id = :id', { id: fromAccountId })
        .getOne();
      if (!acct || acct.userId !== userId || acct.status !== AccountStatus.OPEN) {
        this.logger.warn(`Invalid source account for loan payment: ${fromAccountId}`);
        throw new ForbiddenException('Invalid source account');
      }
      if (BigInt(acct.balanceCents) < amount) {
        this.logger.warn(
          `Insufficient funds for loan payment: account=${fromAccountId}, balance=${acct.balanceCents}, required=${amountCents}`,
        );
        throw new BadRequestException('Insufficient funds');
      }

      // Create a withdrawal transaction
      // If two requests with same paymentId race
      // we run all writes in ONE DB transaction so partial states don't commit.
      const wtx = await m.getRepository(TransactionEntity).save({
        account: { id: fromAccountId },
        type: TransactionType.WITHDRAWAL,
        amountCents: amountCents,
        createdByUserId: userId,
        idempotencyKey: paymentId,
      });

      // Decrement balance + ledger withdrawal
      acct.balanceCents = acct.balanceCents - amountCents;
      await m.getRepository(AccountEntity).save(acct);

      await m.getRepository(BankLedgerEntity).save({
        kind: BankLedgerKind.WITHDRAWAL,
        amountCents: -amountCents,
        transaction: { id: wtx.id },
      });

      // Insert payment using client-supplied ID (idempotency via PK)
      const pay = await m.getRepository(LoanPaymentEntity).save({
        id: paymentId,
        loan: { id: loanId },
        amountCents: amountCents,
        paidFromAccountId: fromAccountId,
      });

      await m.getRepository(BankLedgerEntity).save({
        kind: BankLedgerKind.LOAN_PAYMENT,
        amountCents: amountCents,
        loanPayment: { id: pay.id },
      });

      if (amountCents === due) {
        this.logger.log(`Loan fully paid, closing loan: ${loanId}`);
        await m
          .getRepository(LoanEntity)
          .update({ id: loanId }, { status: LoanStatus.CLOSED, decisionAt: new Date() });
      }

      const { due: remaining } = await this.calcDue(m, loanId);

      this.logger.log(
        `Loan payment completed: paymentId=${paymentId}, loanId=${loanId}, amount=${amount}, remaining=${remaining}`,
      );

      return {
        paymentId,
        loanId,
        amountCents: amountCents,
        remainingCents: remaining,
        occurredAt: new Date(),
      } as LoanPaymentResultDto;
    });
  }
  private async calcDue(
    m: EntityManager,
    loanId: string,
  ): Promise<{ drawn: number; repaid: number; due: number }> {
    const disbursedResult = await m
      .getRepository(LoanDisbursementEntity)
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.amount_cents), 0)', 'disbursed')
      .where('d.loan_id = :loanId', { loanId })
      .getRawOne<{ disbursed: string }>();

    const repaidResult = await m
      .getRepository(LoanPaymentEntity)
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount_cents), 0)', 'repaid')
      .where('p.loan_id = :loanId', { loanId })
      .getRawOne<{ repaid: string }>();

    const drawn = parseInt(disbursedResult?.disbursed ?? '0');
    const paid = parseInt(repaidResult?.repaid ?? '0');
    const due = drawn > paid ? drawn - paid : 0;

    return { drawn, repaid: paid, due };
  }
}
