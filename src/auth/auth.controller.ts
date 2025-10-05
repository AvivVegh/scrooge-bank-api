import {
  Body,
  Controller,
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  refreshTokenMaxAge;
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
    const { accessToken, refreshToken } = await this.authService.register(
      createUserDto.email,
      createUserDto.password,
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.refreshTokenMaxAge,
    });

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
  async login(@Body(ValidationPipe) loginDto: LoginDto, @Req() req, @Res() res: Response) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    if (!req.user.id || !req.user.roles) {
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
    const refreshToken = req.cookies?.['refresh_token'];
    console.log('refreshToken: ', refreshToken);
    const userId = refreshDto.userId;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    if (!userId) {
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

    return res.json({ accessToken });
  }
}
