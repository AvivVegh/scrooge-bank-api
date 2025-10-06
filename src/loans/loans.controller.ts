import { Body, Controller, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApplyLoanDto } from './dto/loan-apply.dto';
import { LoansService } from './loans.service';

@ApiTags('Loan')
@Controller('loan')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private loansService: LoansService) {}

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
    console.log('req.user: ', req.user);
    return this.loansService.applyForLoan({
      userId: req.user?.userId,
      amount: applyLoanDto.amount,
      idemKey: applyLoanDto.idempotencyKey,
    });
  }
}
