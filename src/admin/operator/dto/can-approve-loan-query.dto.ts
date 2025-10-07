import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber } from 'class-validator';

export class CanApproveLoanResultDto {
  @ApiProperty({
    description: 'Can approve loan',
    example: true,
  })
  @IsBoolean({ message: 'Can approve loan must be a boolean' })
  @IsNotEmpty({ message: 'Can approve loan is required' })
  canApprove: boolean;

  @ApiProperty({
    description: 'Available for loans in cents',
    example: 1000000,
  })
  @IsNumber({}, { message: 'Available for loans must be a number' })
  @IsNotEmpty({ message: 'Available for loans is required' })
  availableForLoansCents: number;

  @ApiProperty({
    description: 'Requested amount in cents',
    example: 50000,
  })
  @IsNumber({}, { message: 'Requested amount must be a number' })
  @IsNotEmpty({ message: 'Requested amount is required' })
  requestedCents: number;
  shortfallCents: number;
}
