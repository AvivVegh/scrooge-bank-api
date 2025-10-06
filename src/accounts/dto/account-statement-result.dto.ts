import { LoanEntity } from '../../entities/loan.entity';
import { TransactionEntity } from '../../entities/transaction.entity';

export class AccountStatementResultDto {
  balance: number;
  loans: LoanEntity[];
  transactions: TransactionEntity[];
}
