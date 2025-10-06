import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';
import { LoansModule } from './loans/loans.module';

function envFiles(): string[] {
  return ['.env'];
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFiles(),
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      expandVariables: true,
    }),
    TypeOrmModule.forRoot(databaseConfig),
    AuthModule,
    AccountsModule,
    LoansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
