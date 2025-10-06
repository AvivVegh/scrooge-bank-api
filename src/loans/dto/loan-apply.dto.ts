import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ApplyLoanDto {
  @ApiProperty({
    description: 'Amount to apply for',
    example: 1000,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount: number;

  @ApiProperty({
    description: 'Idempotency key to prevent duplicate applications',
    example: 'unique-client-key-123',
    required: false,
  })
  @IsString({ message: 'Idempotency key must be a string' })
  @IsOptional({ message: 'Idempotency key is optional' })
  idempotencyKey?: string;
}
