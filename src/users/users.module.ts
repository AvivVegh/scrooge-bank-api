import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokensEntity } from '../entities/refresh-tokens.entity';
import { UsersEntity } from '../entities/users.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsersEntity, RefreshTokensEntity])],
  controllers: [],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
