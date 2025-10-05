import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({
    description: 'Account ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Account ID must be a string' })
  @IsNotEmpty({ message: 'Account ID is required' })
  accountId: string;

  @ApiProperty({
    description: 'Amount to withdraw',
    example: 100,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount: number;

  @ApiProperty({
    description: 'Idempotency key',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Idempotency key must be a string' })
  @IsOptional({ message: 'Idempotency key is optional' })
  idempotencyKey?: string;
}
