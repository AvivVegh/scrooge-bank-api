import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CloseAccountDto } from './dto/close-account.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { DepositResultDto } from './dto/deposit-result.dto';
import { GetAccountStatementDto } from './dto/get-account-statement.dto';
import { GetAccountDto } from './dto/get-account.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('Account')
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(private accountsService: AccountsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Account already exists for this user' })
  async create(@Req() req: Request & { user: { userId: string } }) {
    this.logger.log(`POST /account/create - User: ${req.user?.userId}`);
    const result = await this.accountsService.create({
      userId: req.user?.userId,
    });
    this.logger.log(`Account created: ${result.id} for user: ${req.user?.userId}`);
    return result;
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get account information' })
  @ApiResponse({ status: 200, description: 'Account information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccount(@Param(ValidationPipe) getAccountDto: GetAccountDto) {
    this.logger.log(`GET /account/${getAccountDto.accountId}`);
    const result = await this.accountsService.findByUserId({ accountId: getAccountDto.accountId });
    this.logger.log(`Account retrieved: ${getAccountDto.accountId}`);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts' })
  @ApiResponse({ status: 200, description: 'Account information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAllAccounts(@Req() req: Request & { user: { userId: string } }) {
    this.logger.log(`GET /account - User: ${req.user?.userId}`);
    const result = await this.accountsService.findAllAccounts({ userId: req.user?.userId });
    this.logger.log(`Retrieved ${result.length} accounts for user: ${req.user?.userId}`);
    return result;
  }

  @Get(':accountId/statement')
  @ApiOperation({ summary: 'Get account statement' })
  @ApiResponse({ status: 200, description: 'Account statement retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccountBalance(
    @Query(ValidationPipe) getAccountStatementDto: GetAccountStatementDto,
    @Param(ValidationPipe) getAccountDto: GetAccountDto,
  ) {
    this.logger.log(
      `GET /account/${getAccountDto.accountId}/statement - From: ${getAccountStatementDto.fromDate}, To: ${getAccountStatementDto.toDate}`,
    );
    const result = await this.accountsService.getAccountStatement({
      accountId: getAccountDto.accountId,
      fromDate: getAccountStatementDto.fromDate,
      toDate: getAccountStatementDto.toDate,
    });
    this.logger.log(`Statement retrieved for account: ${getAccountDto.accountId}`);
    return result;
  }

  @Post('close')
  @ApiOperation({ summary: 'Close account' })
  @ApiResponse({ status: 200, description: 'Account closed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async closeAccount(
    @Body(ValidationPipe) closeAccountDto: CloseAccountDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    this.logger.log(
      `POST /account/close - Account: ${closeAccountDto.accountId}, User: ${req.user?.userId}`,
    );
    const result = await this.accountsService.closeAccount({
      userId: req.user?.userId,
      accountId: closeAccountDto.accountId,
    });
    this.logger.log(`Account closed: ${closeAccountDto.accountId}`);
    return result;
  }

  @Post('deposit')
  @ApiOperation({
    summary: 'Deposit funds into an account (loan accounts cannot be deposited into)',
  })
  @ApiResponse({ status: 200, description: 'Funds deposited successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async deposit(
    @Body(ValidationPipe) depositDto: CreateDepositDto,
    @Req() req: Request & { user: { userId: string } },
  ): Promise<DepositResultDto> {
    this.logger.log(
      `POST /account/deposit - Account: ${depositDto.accountId}, Amount: ${depositDto.amount}, User: ${req.user?.userId}`,
    );
    const result = await this.accountsService.deposit({
      userId: req.user?.userId,
      accountId: depositDto.accountId,
      amount: depositDto.amount,
      idempotencyKey: depositDto.idempotencyKey,
    });
    this.logger.log(`Deposit completed: ${depositDto.amount} to account ${depositDto.accountId}`);
    return result;
  }

  @Post('withdraw')
  @ApiOperation({
    summary: 'Withdraw funds from an account (loan accounts cannot be withdrawn from)',
  })
  @ApiResponse({ status: 200, description: 'Funds withdrawn successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async withdraw(
    @Body(ValidationPipe) withdrawDto: WithdrawDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    this.logger.log(
      `POST /account/withdraw - Account: ${withdrawDto.accountId}, Amount: ${withdrawDto.amount}, User: ${req.user?.userId}`,
    );
    const result = await this.accountsService.withdraw({
      accountId: withdrawDto.accountId,
      amount: withdrawDto.amount,
      userId: req.user?.userId,
      idempotencyKey: withdrawDto.idempotencyKey,
    });
    this.logger.log(
      `Withdrawal completed: ${withdrawDto.amount} from account ${withdrawDto.accountId}`,
    );
    return result;
  }
}
