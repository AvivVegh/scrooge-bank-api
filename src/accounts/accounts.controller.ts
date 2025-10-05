import { Body, Controller, Get, Param, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CloseAccountDto } from './dto/close-account.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { GetAccountDto } from './dto/get-account.dto';

@ApiTags('Account')
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Account already exists for this user' })
  async create(
    @Req() req: Request & { user: { userId: string } },
    @Body(ValidationPipe) createAccountDto: CreateAccountDto,
  ) {
    console.log('req.user: ', req.user);
    return this.accountsService.create({
      userId: req.user?.userId,
      accountType: createAccountDto.accountType,
    });
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get account information' })
  @ApiResponse({ status: 200, description: 'Account information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccount(@Param(ValidationPipe) getAccountDto: GetAccountDto) {
    console.log('getAccountDto: ', getAccountDto);
    return this.accountsService.findByUserId({ accountId: getAccountDto.accountId });
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts' })
  @ApiResponse({ status: 200, description: 'Account information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAllAccounts(@Req() req: Request & { user: { userId: string } }) {
    console.log('req.user: ', req.user);
    // get all accounts for the user
    return this.accountsService.findAllAccounts({ userId: req.user?.userId });
  }

  @Post('close')
  @ApiOperation({ summary: 'Close account' })
  @ApiResponse({ status: 200, description: 'Account closed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async closeAccount(@Body(ValidationPipe) closeAccountDto: CloseAccountDto) {
    return this.accountsService.closeAccount({ accountId: closeAccountDto.accountId });
  }
}
