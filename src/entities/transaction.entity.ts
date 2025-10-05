import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AccountEntity } from './account.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
}

@Entity('transactions')
@Index(['account', 'idempotencyKey'], { unique: true, where: `"idempotencyKey" IS NOT NULL` })
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => AccountEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;

  @Column({ type: 'enum', enum: ['deposit', 'withdrawal'] })
  type: TransactionType;

  @Column({ type: 'bigint', name: 'amount_cents' }) amountCents: number;

  @Column({ nullable: true, name: 'idempotency_key' }) idempotencyKey?: string;

  @Column({ name: 'created_by_user_id' }) createdByUserId: string;

  @Column({ type: 'timestamp', name: 'created_at' }) createdAt: Date;
}
