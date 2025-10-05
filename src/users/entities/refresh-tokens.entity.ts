import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokensEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  jti: string;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column()
  revoked: boolean;

  @Column({
    type: 'timestamp',
    name: 'expires_at',
  })
  expiresAt: Date;
}
