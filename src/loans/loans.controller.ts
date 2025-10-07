import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApplyLoanDto } from './dto/loan-apply.dto';
import { LoanPaymentDto } from './dto/loan-payment.dto';
import { LoansService } from './loans.service';

@ApiTags('Loan')
@Controller('loan')
@UseGuards(JwtAuthGuard)
export class LoansController {
  private readonly logger = new Logger(LoansController.name);

  constructor(private loansService: LoansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all loans' })
  @ApiResponse({ status: 200, description: 'Loans successfully fetched' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLoans(@Req() req: Request & { user: { userId: string } }) {
    this.logger.log(`GET /loan - User: ${req.user?.userId}`);
    const result = await this.loansService.getLoans({ userId: req.user?.userId });
    this.logger.log(`Retrieved ${result.length} loans for user: ${req.user?.userId}`);
    return result;
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply for a new loan' })
  @ApiResponse({ status: 201, description: 'Loan successfully applied' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Loan already exists for this user' })
  async apply(
    @Req() req: Request & { user: { userId: string } },
    @Body(ValidationPipe) applyLoanDto: ApplyLoanDto,
  ) {
    this.logger.log(`POST /loan/apply - User: ${req.user?.userId}, Amount: ${applyLoanDto.amount}`);
    const result = await this.loansService.applyForLoan({
      userId: req.user?.userId,
      amount: applyLoanDto.amount,
      idemKey: applyLoanDto.idempotencyKey,
    });
    this.logger.log(`Loan application result: ${result.status} for user: ${req.user?.userId}`);
    return result;
  }

  @Post(':loanId/payment/:paymentId')
  @ApiOperation({ summary: 'Make a payment for a loan' })
  @ApiParam({ name: 'loanId', description: 'The unique identifier of the loan', type: String })
  @ApiParam({
    name: 'paymentId',
    description: 'Idempotency key for the payment transaction',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Payment made  successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or loan not found' })
  async payment(
    @Param('loanId') loanId: string,
    @Param('paymentId') paymentId: string,
    @Req() req: Request & { user: { userId: string } },
    @Body(ValidationPipe) loanPaymentDto: LoanPaymentDto,
  ) {
    this.logger.log(
      `POST /loan/${loanId}/payment/${paymentId} - User: ${req.user?.userId}, Amount: ${loanPaymentDto.amount}, Account: ${loanPaymentDto.fromAccountId}`,
    );
    const result = await this.loansService.loanPayment({
      userId: req.user?.userId,
      amount: loanPaymentDto.amount,
      fromAccountId: loanPaymentDto.fromAccountId,
      loanId: loanId,
      paymentId: paymentId,
    });
    this.logger.log(
      `Loan payment completed: ${paymentId} for loan ${loanId}, remaining: ${result.remainingCents}`,
    );
    return result;
  }
}
