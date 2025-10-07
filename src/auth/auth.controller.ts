import {
  Body,
  Controller,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  refreshTokenMaxAge: number;

  constructor(private authService: AuthService) {
    this.refreshTokenMaxAge = 30 * 24 * 3600 * 1000;
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'JWT access token',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async register(@Body(ValidationPipe) createUserDto: CreateUserDto, @Res() res: Response) {
    this.logger.log(`POST /auth/register - Email: ${createUserDto.email}`);

    const { accessToken, refreshToken } = await this.authService.register({
      email: createUserDto.email,
      password: createUserDto.password,
      roles: createUserDto.roles,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.refreshTokenMaxAge,
    });

    this.logger.log(`Registration successful for email: ${createUserDto.email}`);
    return res.json({ accessToken });
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'JWT access token',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.logger.log(`POST /auth/login - Email: ${loginDto.email}`);

    if (!req.user) {
      this.logger.warn(`Login failed: no user in request for ${loginDto.email}`);
      throw new UnauthorizedException();
    }

    if (!req.user.id || !req.user.roles) {
      this.logger.warn(`Login failed: missing user id or roles for ${loginDto.email}`);
      throw new UnauthorizedException();
    }

    const { accessToken, refreshToken } = await this.authService.issueTokens({
      sub: req.user.id,
      roles: req.user.roles,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.refreshTokenMaxAge,
    });

    this.logger.log(`Login successful for user: ${req.user.id}`);
    return res.json({ accessToken });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'New JWT access token',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid refresh token' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async refresh(
    @Body(ValidationPipe) refreshDto: RefreshDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`POST /auth/refresh - User: ${refreshDto.userId}`);

    const refreshToken = req.cookies?.['refresh_token'] as string;
    const userId = refreshDto.userId;

    if (!refreshToken) {
      this.logger.warn(`Refresh failed: token not found in cookies for user ${userId}`);
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    if (!userId) {
      this.logger.warn('Refresh failed: no user ID provided');
      throw new UnauthorizedException('User ID is required');
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.authService.rotateRefresh(
      userId,
      refreshToken,
    );

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.refreshTokenMaxAge,
    });

    this.logger.log(`Token refresh successful for user: ${userId}`);
    return res.json({ accessToken });
  }
}
