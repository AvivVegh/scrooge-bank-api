import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../entities/account.entity';
import { BankLedgerEntity } from '../entities/bank-ledger.entity';
import { LoanEntity } from '../entities/loan.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountEntity, TransactionEntity, BankLedgerEntity, LoanEntity]),
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
