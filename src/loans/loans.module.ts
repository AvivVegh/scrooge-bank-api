import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from 'src/entities/account.entity';
import { BankLedgerEntity } from 'src/entities/bank-ledger.entity';
import { LoanDisbursementEntity } from 'src/entities/loan-disbursement.entity';
import { LoanPaymentEntity } from 'src/entities/loan-payment.entity';
import { LoanEntity } from 'src/entities/loan.entity';
import { UsersEntity } from 'src/entities/users.entity';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanEntity,
      LoanDisbursementEntity,
      LoanPaymentEntity,
      BankLedgerEntity,
      AccountEntity,
      UsersEntity,
    ]),
  ],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
