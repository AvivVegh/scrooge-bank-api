// src/bank/bank-ledger.entity.ts (FKs nullable!)
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionEntity } from './transaction.entity';

export enum BankLedgerKind {
  BASE_CASH = 'base_cash',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  LOAN_DISBURSED = 'loan_disbursed',
  LOAN_PAYMENT = 'loan_payment',
  ADJUSTMENT = 'adjustment',
}

@Entity('bank_ledger')
export class BankLedgerEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({
    type: 'enum',
    enum: BankLedgerKind,
  })
  kind: BankLedgerKind;

  @Column({ type: 'bigint', name: 'amount_cents' }) amountCents: number;

  @CreateDateColumn({ type: 'timestamp', name: 'occurred_at' }) occurredAt: Date;

  @ManyToOne(() => TransactionEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: TransactionEntity | null;

  @Column({ nullable: true, name: 'memo' }) memo?: string;
}
