// src/loans/loans.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccountEntity, AccountStatus, AccountType } from '../entities/account.entity';
import { BankLedgerEntity, BankLedgerKind } from '../entities/bank-ledger.entity';
import { LoanDisbursementEntity } from '../entities/loan-disbursement.entity';
import { LoanPaymentEntity } from '../entities/loan-payment.entity';
import { LoanEntity, LoanStatus } from '../entities/loan.entity';
import { convertToCents } from '../lib/utils';
import { ApplyLoanResultDto } from './dto/loan-apply-result.dto';

@Injectable()
export class LoansService {
  private static readonly ADVISORY_LOCK_ID = 42;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(LoanEntity) private readonly loanRepo: Repository<LoanEntity>,
    @InjectRepository(LoanDisbursementEntity)
    private readonly disbRepo: Repository<LoanDisbursementEntity>,
    @InjectRepository(LoanPaymentEntity)
    private readonly paymentRepo: Repository<LoanPaymentEntity>,
    @InjectRepository(BankLedgerEntity) private readonly ledgerRepo: Repository<BankLedgerEntity>,
    @InjectRepository(AccountEntity) private readonly accountRepo: Repository<AccountEntity>,
  ) {}

  async applyForLoan({
    userId,
    amount,
    idemKey,
  }: {
    userId: string;
    amount: number;
    idemKey?: string;
  }): Promise<ApplyLoanResultDto> {
    const amountCents = convertToCents(amount);

    return this.ds.transaction(async m => {
      // 1) Serialize approvals across the bank
      await m.query('SELECT pg_advisory_xact_lock($1)', [LoansService.ADVISORY_LOCK_ID]);

      // 2) Validate user has an open account
      const account = await m.getRepository(AccountEntity).findOne({
        where: { userId, status: AccountStatus.OPEN, type: AccountType.LOAN },
      });

      if (!account) {
        throw new NotFoundException('User must have an open account to apply for loans');
      }

      // 3) Idempotency: return previous decision if same key exists
      if (idemKey) {
        const existing = await m
          .getRepository(LoanEntity)
          .findOne({ where: { userId, client_key: idemKey } as any });
        if (existing) {
          if (existing.principalCents !== amountCents) {
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

      // 4) Compute availability from ledger (snapshot inside this tx)
      const [row] = await m.query(`
        SELECT
          COALESCE(SUM(CASE WHEN kind='base_cash'      THEN amount_cents END), 0) AS base_cash,
          COALESCE(SUM(CASE WHEN kind='deposit'        THEN amount_cents END), 0) AS deposits_sum,
          COALESCE(SUM(CASE WHEN kind='withdrawal'     THEN amount_cents END), 0) AS withdrawals_sum,
          COALESCE(SUM(CASE WHEN kind='loan_disbursed' THEN amount_cents END), 0) AS disbursed_sum,
          COALESCE(SUM(CASE WHEN kind='loan_payment'   THEN amount_cents END), 0) AS payments_sum
        FROM bank_ledger
      `);

      const baseCash = parseInt(row.base_cash);
      const depositsOnHand = parseInt(row.deposits_sum) + parseInt(row.withdrawals_sum); // withdrawals are negative
      const loanableFromDeposits = depositsOnHand > 0 ? depositsOnHand / 4 : 0; // floor 25%
      const drawn = -parseInt(row.disbursed_sum); // disbursed_sum is negative in ledger
      const repaid = parseInt(row.payments_sum);
      const outstanding = drawn - repaid;
      const available = baseCash + loanableFromDeposits - outstanding;

      // 5) Approve or reject
      if (amount <= available) {
        // Approve & disburse immediately (outside bank; no account credit here)
        const loan = await m.getRepository(LoanEntity).save({
          userId,
          principal_cents: amountCents,
          status: LoanStatus.APPROVED,
          client_key: idemKey,
          decisionAt: new Date(),
        });

        const disb = await m.getRepository(LoanDisbursementEntity).save({
          loan: { id: loan.id },
          amount_cents: amountCents,
        });

        await m.getRepository(BankLedgerEntity).save({
          kind: BankLedgerKind.LOAN_DISBURSED,
          amount_cents: -amountCents,
          loan_disbursement: { id: disb.id },
        });

        return {
          loanId: loan.id,
          status: LoanStatus.APPROVED,
          principalCents: loan.principalCents,
          disbursementId: disb.id,
          decisionAt: loan.decisionAt,
        } as ApplyLoanResultDto;
      } else {
        const loan = await m.getRepository(LoanEntity).save({
          userId,
          principal_cents: amountCents,
          status: LoanStatus.REJECTED,
          reason: 'insufficient_bank_funds',
          client_key: idemKey,
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
}
