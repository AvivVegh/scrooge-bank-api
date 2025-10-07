import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankLedgerEntity } from '../../entities/bank-ledger.entity';
import { LoansModule } from '../../loans/loans.module';
import { OperatorController } from './operator.controller';
import { OperatorService } from './operator.service';

@Module({
  imports: [TypeOrmModule.forFeature([BankLedgerEntity]), LoansModule],
  controllers: [OperatorController],
  providers: [OperatorService],
})
export class OperatorModule {}
