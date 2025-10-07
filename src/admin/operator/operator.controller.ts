import { Controller, Get, Logger, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/entities/users.entity';
import { Roles, RolesGuard } from 'src/guards/roles.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { BalanceResultDto } from './dto/balance-result.dto';
import { CanApproveLoanResultDto } from './dto/can-approve-loan-query.dto';
import { CanApproveLoanQueryDto } from './dto/can-approve-loan-result.dto';
import { OperatorService } from './operator.service';

// - As the bank operator, I should be able to see how much money total we currently have on hand.
// - As the bank operator, user withdrawals are allowed to put the bank into debt, but loans are not.

@ApiTags('Operator')
@Controller('/admin/operator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperatorController {
  private readonly logger = new Logger(OperatorController.name);

  constructor(private operatorService: OperatorService) {}

  @Get('balance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get total bank cash on hand (can be negative due to withdrawals)' })
  @ApiResponse({
    status: 200,
    description: 'Bank balance retrieved successfully',
    schema: {
      example: {
        balanceCents: 1000000,
        balance: 10000.0,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async bankBalance(@Req() req: Request & { user: { userId: string } }): Promise<BalanceResultDto> {
    this.logger.log(`GET /operator/balance - User: ${req.user?.userId}`);

    const result = await this.operatorService.bankBalance({
      userId: req.user?.userId,
    });

    this.logger.log(
      `Bank balance retrieved: $${result.balance.toFixed(2)} (${result.balanceCents} cents)`,
    );
    return result;
  }

  @Get('loan-funds')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get detailed breakdown of available funds for loan disbursement',
    description:
      'Returns bank balance and available loan capacity. Note: Withdrawals can put the bank into debt, but loans cannot.',
  })
  @ApiResponse({
    status: 200,
    description: 'Loan funds breakdown retrieved successfully',
    schema: {
      example: {
        balanceCents: 950000,
        balance: 9500.0,
        baseCashCents: 1000000,
        depositsOnHandCents: 500000,
        loanableFromDepositsCents: 125000,
        outstandingLoansCents: 175000,
        availableForLoansCents: 950000,
        availableForLoans: 9500.0,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getLoanFunds(@Req() req: Request & { user: { userId: string } }) {
    this.logger.log(`GET /operator/loan-funds - User: ${req.user?.userId}`);

    const result = await this.operatorService.getAvailableLoanFunds({
      userId: req.user?.userId,
    });

    this.logger.log(
      `Loan funds retrieved: available=$${result.availableForLoans.toFixed(2)}, balance=$${result.balance.toFixed(2)}`,
    );
    return result;
  }

  @Get('can-approve-loan')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Check if a loan amount can be approved based on available funds',
    description:
      'Validates whether a loan of the specified amount would be approved. Loans cannot put the bank into debt.',
  })
  @ApiQuery({
    name: 'amountCents',
    type: Number,
    description: 'Loan amount in cents',
    example: 50000,
  })
  @ApiResponse({
    status: 200,
    description: 'Loan approval check completed',
    schema: {
      example: {
        canApprove: true,
        availableForLoansCents: 950000,
        requestedCents: 50000,
        shortfallCents: 0,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async canApproveLoan(
    @Req() req: Request & { user: { userId: string } },
    @Query(new ValidationPipe({ transform: true })) amountDto: CanApproveLoanQueryDto,
  ): Promise<CanApproveLoanResultDto> {
    this.logger.log(
      `GET /operator/can-approve-loan?amountCents=${amountDto.amount} - User: ${req.user?.userId}`,
    );

    const result = await this.operatorService.canApproveLoan({
      userId: req.user?.userId,
      amount: amountDto.amount,
    });

    this.logger.log(
      `Loan approval check: canApprove=${result.canApprove}, available=${result.availableForLoansCents}¢, requested=${result.requestedCents}¢`,
    );
    return result;
  }
}
