import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class BalanceResultDto {
  @ApiProperty({
    description: 'Balance in cents',
    example: 1000000,
  })
  @IsNumber({}, { message: 'Balance must be a number' })
  @IsNotEmpty({ message: 'Balance is required' })
  balanceCents: number;

  @ApiProperty({
    description: 'Balance in dollars',
    example: 10000.0,
  })
  @IsNumber({}, { message: 'Balance must be a number' })
  @IsNotEmpty({ message: 'Balance is required' })
  balance: number;
}
