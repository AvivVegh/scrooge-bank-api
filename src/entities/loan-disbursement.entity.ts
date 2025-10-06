import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LoanEntity } from './loan.entity';

@Entity('loan_disbursements')
export class LoanDisbursementEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @ManyToOne(() => LoanEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loan_id' })
  loan: LoanEntity;

  @Column({ name: 'amount_cents', type: 'bigint' }) amountCents: number;

  @Column({ name: 'created_at', type: 'timestamp', nullable: false }) createdAt: Date;
}
