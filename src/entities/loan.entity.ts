import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum LoanStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('loans')
export class LoanEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'user_id' }) userId: string;

  @Column({ name: 'principal_cents', type: 'bigint' }) principalCents: number;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.PENDING })
  status: LoanStatus;

  @Column({ name: 'client_key', nullable: true }) clientKey?: string;

  @Column({ name: 'reason' }) reason: string;

  @Column({ name: 'created_at' }) createdAt: Date;

  @Column({ name: 'decision_at' }) decisionAt: Date;
}
