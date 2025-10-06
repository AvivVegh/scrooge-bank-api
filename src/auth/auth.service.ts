// auth.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { add } from 'date-fns';
import { UserRole } from '../entities/users.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpirationTime: string;

  constructor(
    private usersService: UsersService,
    private jwt: JwtService,
  ) {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET is not set');
    }

    if (!process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME) {
      throw new Error('JWT_ACCESS_TOKEN_EXPIRATION_TIME is not set');
    }

    this.accessTokenExpirationTime = process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME;
  }

  async register(email: string, password: string) {
    this.logger.log(`Registration attempt for email: ${email}`);

    const password_hash = await argon2.hash(password);
    const user = await this.usersService.create({
      email,
      password_hash,
      roles: [UserRole.USER],
    });

    this.logger.log(`User created successfully: ${user.id} with email: ${email}`);
    const tokens = await this.issueTokens({ sub: user.id, roles: user.roles });
    this.logger.log(`Tokens issued for user: ${user.id}`);
    return tokens;
  }

  async validateUser(email: string, password: string) {
    this.logger.debug(`Validating user: ${email}`);

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.warn(`User not found: ${email}`);
      return null;
    }

    const ok = await argon2.verify(user.passwordHash, password);

    if (ok) {
      this.logger.log(`User validated successfully: ${email}`);
    } else {
      this.logger.warn(`Invalid password for user: ${email}`);
    }

    return ok ? user : null;
  }

  async login(email: string, password: string) {
    this.logger.log(`Login attempt for email: ${email}`);

    const user = await this.validateUser(email, password);

    if (!user) {
      this.logger.warn(`Login failed for email: ${email}`);
      throw new UnauthorizedException();
    }

    this.logger.log(`Login successful for user: ${user.id}`);
    const tokens = await this.issueTokens({ sub: user.id, roles: user.roles });
    return tokens;
  }

  async issueTokens({ sub, roles }: { sub: string; roles: string[] }) {
    this.logger.debug(`Issuing tokens for user: ${sub} with roles: ${roles.join(', ')}`);

    const accessToken = await this.jwt.signAsync(
      { sub, roles },
      { expiresIn: this.accessTokenExpirationTime },
    );

    const jti = randomUUID();
    const refreshToken = randomUUID() + '.' + randomUUID();

    await this.usersService.storeRefresh({
      userId: sub,
      jti,
      tokenHash: await argon2.hash(refreshToken),
      revoked: false,
      expiresAt: add(new Date(), { days: 30 }),
    });

    this.logger.log(`Tokens issued successfully for user: ${sub}`);
    return { accessToken, refreshToken };
  }

  async rotateRefresh(userId: string, incomingToken: string) {
    this.logger.log(`Token rotation request for user: ${userId}`);

    if (!incomingToken) {
      this.logger.warn(`Token rotation failed: no token provided for user ${userId}`);
      throw new UnauthorizedException('Refresh token is required');
    }

    const rec = await this.usersService.findActiveRefreshByUser(userId);

    if (!rec) {
      const message = 'No active refresh token found for user';
      this.logger.warn(`Token rotation failed for user ${userId}: ${message}`);
      throw new UnauthorizedException(message);
    }

    const ok = await argon2.verify(rec.tokenHash, incomingToken);

    if (!ok || rec.revoked || rec.expiresAt < new Date()) {
      const message = ok ? 'Invalid, revoked, or expired refresh token' : 'Invalid refresh token';
      this.logger.warn(`Token rotation failed for user ${userId}: ${message}`);
      throw new UnauthorizedException(message);
    }

    // revoke old + issue new
    this.logger.debug(`Revoking old refresh token for user: ${userId}`);
    await this.usersService.revokeRefresh(rec.id);
    const user = await this.usersService.findById(userId);

    if (!user) {
      const message = 'User not found';
      this.logger.error(`Token rotation failed for user ${userId}: ${message}`);
      throw new UnauthorizedException(message);
    }

    this.logger.log(`Token rotation successful for user: ${userId}`);
    return this.issueTokens({ sub: userId, roles: user.roles });
  }
}
