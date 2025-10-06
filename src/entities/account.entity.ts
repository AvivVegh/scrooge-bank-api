import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum AccountStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('accounts')
@Unique(['userId'])
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'balance_cents' })
  balanceCents: number;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.OPEN })
  status: AccountStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'closed_at', nullable: true })
  closedAt: Date | null;
}
