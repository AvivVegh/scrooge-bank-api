import { LoanEntity } from 'src/entities/loan.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';

export class AccountStatementResultDto {
  balance: number;
  loans: LoanEntity[];
  transactions: TransactionEntity[];
}
