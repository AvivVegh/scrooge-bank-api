import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { LoanStatus } from '../../entities/loan.entity';

export class ApplyLoanResultDto {
  @ApiProperty({
    description: 'Loan ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Loan ID must be a string' })
  @IsNotEmpty({ message: 'Loan ID is required' })
  loanId: string;

  @ApiProperty({
    description: 'Status',
    example: 'approved',
  })
  @IsString({ message: 'Status must be a string' })
  @IsNotEmpty({ message: 'Status is required' })
  status: LoanStatus;

  @ApiProperty({
    description: 'Decision at',
    example: '2021-01-01T00:00:00.000Z',
  })
  @IsDate({ message: 'Decision at must be a date' })
  @IsNotEmpty({ message: 'Decision at is required' })
  decisionAt: Date;

  @ApiProperty({
    description: 'Principal amount in cents',
    example: 1000,
  })
  @IsNumber({}, { message: 'Principal amount must be a number' })
  @IsNotEmpty({ message: 'Principal amount is required' })
  principalCents: number;

  @ApiProperty({
    description: 'Reason',
    example: 'insufficient_bank_funds',
  })
  @IsString({ message: 'Reason must be a string' })
  @IsOptional({ message: 'Reason is optional' })
  reason?: string;

  @ApiProperty({
    description: 'Disbursement ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Disbursement ID must be a string' })
  @IsOptional({ message: 'Disbursement ID is optional' })
  disbursementId?: string | null;
}
