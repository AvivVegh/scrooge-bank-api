import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoanPaymentLoanDto {
  @ApiProperty({
    description: 'Loan ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Loan ID must be a string' })
  @IsNotEmpty({ message: 'Loan ID is required' })
  loanId: string;
}
