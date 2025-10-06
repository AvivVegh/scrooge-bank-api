// src/bank/bank-ledger.entity.ts (FKs nullable!)
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LoanDisbursementEntity } from './loan-disbursement.entity';
import { LoanPaymentEntity } from './loan-payment.entity';
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

  @ManyToOne(() => LoanDisbursementEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_disbursement_id' })
  loanDisbursement?: LoanDisbursementEntity | null;

  @ManyToOne(() => LoanPaymentEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_payment_id' })
  loanPayment?: LoanPaymentEntity | null;

  @Column({ nullable: true, name: 'memo' }) memo?: string;
}
