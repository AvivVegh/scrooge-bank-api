import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../entities/account.entity';
import { BankLedgerEntity } from '../entities/bank-ledger.entity';
import { LoanDisbursementEntity } from '../entities/loan-disbursement.entity';
import { LoanPaymentEntity } from '../entities/loan-payment.entity';
import { LoanEntity } from '../entities/loan.entity';
import { UsersEntity } from '../entities/users.entity';
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
  exports: [LoansService],
})
export class LoansModule {}
