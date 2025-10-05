import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DepositResultDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Transaction ID must be a string' })
  @IsNotEmpty({ message: 'Transaction ID is required' })
  transactionId: string;

  @ApiProperty({
    description: 'Account ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Account ID must be a string' })
  @IsNotEmpty({ message: 'Account ID is required' })
  accountId: string;

  @ApiProperty({
    description: 'New balance in cents',
    example: 100,
  })
  @IsNumber({}, { message: 'New balance must be a number' })
  @IsNotEmpty({ message: 'New balance is required' })
  newBalanceCents: number;

  @ApiProperty({
    description: 'Created at',
    example: '2021-01-01T00:00:00.000Z',
  })
  @IsDate({ message: 'Created at must be a date' })
  @IsNotEmpty({ message: 'Created at is required' })
  createdAt: Date;
}
