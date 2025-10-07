import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { convertToCents } from 'src/lib/utils';
import { LoansService } from 'src/loans/loans.service';
import { DataSource, Repository } from 'typeorm';
import { BankLedgerEntity } from '../../entities/bank-ledger.entity';
import { BalanceResultDto } from './dto/balance-result.dto';

@Injectable()
export class OperatorService {
  private readonly logger = new Logger(OperatorService.name);

  constructor(
    @InjectRepository(BankLedgerEntity)
    private bankLedgerRepository: Repository<BankLedgerEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly loansService: LoansService,
  ) {}

  /**
   * Get the current bank's cash balance.
   * Note: This can be negative if withdrawals have put the bank into debt.
   *
   * Bank Policy:
   * - User withdrawals ARE allowed to put the bank into negative balance
   * - Loans are NOT allowed if they would put the bank into negative balance
   */
  async bankBalance(params: { userId: string }): Promise<BalanceResultDto> {
    this.logger.log(`Getting bank balance - requested by user: ${params.userId}`);

    // Sum all entries in the bank ledger to get total cash on hand
    const result = await this.bankLedgerRepository
      .createQueryBuilder('ledger')
      .select('SUM(ledger.amountCents)', 'total')
      .getRawOne();

    const balanceCents = result?.total ? parseInt(result.total, 10) : 0;
    const balance = balanceCents / 100;

    this.logger.log(`Bank balance: $${balance.toFixed(2)} (${balanceCents} cents)`);

    return {
      balanceCents,
      balance,
    };
  }

  async getAvailableLoanFunds({ userId }: { userId: string }): Promise<{
    balanceCents: number;
    balance: number;
    baseCashCents: number;
    depositsOnHandCents: number;
    loanableFromDepositsCents: number;
    outstandingLoansCents: number;
    availableForLoansCents: number;
    availableForLoans: number;
  }> {
    this.logger.log(`Getting available loan funds - requested by user: ${userId}`);

    const { baseCash, depositsOnHand, loanableFromDeposits, outstandingLoans, availableForLoans } =
      await this.loansService.getBankFunds(this.dataSource.manager);

    return {
      balanceCents: baseCash + depositsOnHand - outstandingLoans,
      balance: (baseCash + depositsOnHand - outstandingLoans) / 100,
      baseCashCents: baseCash,
      depositsOnHandCents: depositsOnHand,
      loanableFromDepositsCents: loanableFromDeposits,
      outstandingLoansCents: outstandingLoans,
      availableForLoansCents: availableForLoans,
      availableForLoans: availableForLoans / 100,
    };
  }

  async canApproveLoan({ userId, amount }: { userId: string; amount: number }): Promise<{
    canApprove: boolean;
    availableForLoansCents: number;
    requestedCents: number;
    shortfallCents: number;
  }> {
    const amountCents = convertToCents(amount);
    this.logger.log(
      `Checking if loan can be approved - amount: ${amountCents}¢, requested by: ${userId}`,
    );

    const loanFunds = await this.getAvailableLoanFunds({ userId });

    const canApprove = amountCents <= loanFunds.availableForLoansCents;
    const shortfallCents = canApprove ? 0 : amountCents - loanFunds.availableForLoansCents;

    this.logger.log(
      `Loan approval check: canApprove=${canApprove}, available=${loanFunds.availableForLoansCents}¢, ` +
        `requested=${amountCents}¢, shortfall=${shortfallCents}¢`,
    );

    return {
      canApprove,
      availableForLoansCents: loanFunds.availableForLoansCents,
      requestedCents: amountCents,
      shortfallCents,
    };
  }
}
