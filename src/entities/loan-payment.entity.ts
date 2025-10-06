import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LoanEntity } from './loan.entity';

@Entity('loan_payments')
export class LoanPaymentEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => LoanEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loan_id' })
  loan: LoanEntity;

  @Column({ name: 'amount_cents', type: 'bigint' }) amountCents: number;

  @Column({ name: 'created_at', type: 'timestamp', nullable: false }) createdAt: Date;
}
