// auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { RefreshTokensEntity } from '../entities/refresh-tokens.entity';
import { UserRole, UsersEntity } from '../entities/users.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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
    this.logger.log(`Creating user with email: ${email}, roles: ${roles.join(', ')}`);

    const user = this.usersRepository.create({
      email,
      passwordHash: password_hash,
      roles,
    });
    const savedUser = await this.usersRepository.save(user);

    this.logger.log(`User created successfully: ${savedUser.id}, email: ${email}`);
    return savedUser;
  }

  async findByEmail(email: string) {
    this.logger.debug(`Finding user by email: ${email}`);

    const user = await this.usersRepository.findOne({ where: { email } });

    if (user) {
      this.logger.debug(`User found: ${user.id}`);
    } else {
      this.logger.debug(`User not found with email: ${email}`);
    }

    return user;
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
    this.logger.debug(`Storing refresh token for user: ${userId}, jti: ${jti}`);

    const refresh = this.refreshRepository.create({
      userId,
      jti,
      tokenHash,
      revoked,
      expiresAt,
    });
    const savedRefresh = await this.refreshRepository.save(refresh);

    this.logger.debug(`Refresh token stored: ${savedRefresh.id} for user: ${userId}`);
    return savedRefresh;
  }

  async findActiveRefreshByUser(userId: string) {
    this.logger.debug(`Finding active refresh token for user: ${userId}`);

    const refresh = await this.refreshRepository.findOne({
      where: { userId, revoked: false, expiresAt: MoreThan(new Date()) },
    });

    if (refresh) {
      this.logger.debug(`Active refresh token found for user: ${userId}`);
    } else {
      this.logger.debug(`No active refresh token found for user: ${userId}`);
    }

    return refresh;
  }

  async revokeRefresh(id: string) {
    this.logger.debug(`Revoking refresh token: ${id}`);

    const result = await this.refreshRepository.update(id, { revoked: true });

    this.logger.debug(`Refresh token revoked: ${id}`);
    return result;
  }

  async findById(id: string): Promise<UsersEntity | null> {
    this.logger.debug(`Finding user by ID: ${id}`);

    const user = await this.usersRepository.findOne({ where: { id } });

    if (user) {
      this.logger.debug(`User found: ${id}`);
    } else {
      this.logger.debug(`User not found with ID: ${id}`);
    }

    return user;
  }
}
