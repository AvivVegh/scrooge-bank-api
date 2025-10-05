import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum AccountStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum AccountType {
  CHECKING = 'checking',
  LOAN = 'loan',
}

@Entity('accounts')
@Unique(['userId', 'type'])
export class AccountsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'balance_cents' })
  balanceCents: number;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.OPEN })
  status: AccountStatus;

  @Column({ type: 'enum', enum: AccountType, default: AccountType.CHECKING })
  type: AccountType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'closed_at', nullable: true })
  closedAt: Date | null;
}
