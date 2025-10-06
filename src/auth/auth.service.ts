// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { add } from 'date-fns';
import { UserRole } from '../entities/users.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly accessTokenExpirationTime;

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
    const password_hash = await argon2.hash(password);
    const user = await this.usersService.create({
      email,
      password_hash,
      roles: [UserRole.USER],
    });

    console.log('user created: ', user.id);
    return this.issueTokens({ sub: user.id, roles: user.roles });
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const ok = await argon2.verify(user.passwordHash, password);

    return ok ? user : null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.issueTokens({ sub: user.id, roles: user.roles });
  }

  async issueTokens({ sub, roles }: { sub: string; roles: string[] }) {
    const accessToken = await this.jwt.signAsync(
      { sub, roles },
      { expiresIn: this.accessTokenExpirationTime as string },
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

    return { accessToken, refreshToken };
  }

  async rotateRefresh(userId: string, incomingToken: string) {
    if (!incomingToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const rec = await this.usersService.findActiveRefreshByUser(userId);

    if (!rec) {
      const message = 'No active refresh token found for user';
      console.error('message: ', message);
      throw new UnauthorizedException(message);
    }

    const ok = await argon2.verify(rec.tokenHash, incomingToken);

    if (!ok || rec.revoked || rec.expiresAt < new Date()) {
      const message = ok ? 'Invalid, revoked, or expired refresh token' : 'Invalid refresh token';
      console.error('message: ', message);
      throw new UnauthorizedException(message);
    }

    // revoke old + issue new
    await this.usersService.revokeRefresh(rec.id);
    const user = await this.usersService.findById(userId);
    if (!user) {
      const message = 'User not found';
      console.error('message: ', message);
      throw new UnauthorizedException(message);
    }
    return this.issueTokens({ sub: userId, roles: user.roles });
  }
}
