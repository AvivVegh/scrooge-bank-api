import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountsEntity } from './entities/accounts.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountsEntity])],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
