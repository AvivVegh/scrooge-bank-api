// auth.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { RefreshTokensEntity } from './entities/refresh-tokens.entity';
import { UserRole, UsersEntity } from './entities/users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersEntity)
    private usersRepository: Repository<UsersEntity>,
    @InjectRepository(RefreshTokensEntity)
    private refreshRepository: Repository<RefreshTokensEntity>,
  ) {}

  async create({
    email,
    password_hash,
    roles,
  }: {
    email: string;
    password_hash: string;
    roles: UserRole[];
  }) {
    const user = this.usersRepository.create({
      email,
      passwordHash: password_hash,
      roles,
    });
    return await this.usersRepository.save(user);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  async storeRefresh({
    userId,
    jti,
    tokenHash,
    revoked,
    expiresAt,
  }: {
    userId: string;
    jti: string;
    tokenHash: string;
    revoked: boolean;
    expiresAt: Date;
  }) {
    const refresh = this.refreshRepository.create({
      userId,
      jti,
      tokenHash,
      revoked,
      expiresAt,
    });
    return await this.refreshRepository.save(refresh);
  }

  async findActiveRefreshByUser(userId: string) {
    return this.refreshRepository.findOne({
      where: { userId, revoked: false, expiresAt: MoreThan(new Date()) },
    });
  }

  async revokeRefresh(id: string) {
    return this.refreshRepository.update(id, { revoked: true });
  }

  async findById(id: string): Promise<UsersEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
