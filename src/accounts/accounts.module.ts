import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankLedgerEntity } from 'src/entities/bank-ledger.entity';
import { LoanEntity } from 'src/entities/loan.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { AccountEntity } from '../entities/account.entity';
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
