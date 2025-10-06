import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class LoanPaymentResultDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Payment ID must be a string' })
  @IsNotEmpty({ message: 'Payment ID is required' })
  paymentId: string;

  @ApiProperty({
    description: 'Loan ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Loan ID must be a string' })
  @IsNotEmpty({ message: 'Loan ID is required' })
  loanId: string;

  @ApiProperty({
    description: 'Amount in cents',
    example: 1000,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsNotEmpty({ message: 'Amount is required' })
  amountCents: number;

  @ApiProperty({
    description: 'Remaining amount in cents',
    example: 1000,
  })
  @IsNumber({}, { message: 'Remaining amount must be a number' })
  @IsNotEmpty({ message: 'Remaining amount is required' })
  remainingCents: number;

  @ApiProperty({
    description: 'Occurred at',
    example: '2021-01-01T00:00:00.000Z',
  })
  @IsDate({ message: 'Occurred at must be a date' })
  @IsNotEmpty({ message: 'Occurred at is required' })
  occurredAt: Date;
}
