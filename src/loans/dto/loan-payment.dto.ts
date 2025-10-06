import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class LoanPaymentDto {
  @ApiProperty({
    description: 'Amount to load',
    example: 1000,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be positive' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount: number;

  @ApiProperty({
    description: 'From account ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'From account ID must be a string' })
  @IsNotEmpty({ message: 'From account ID is required' })
  fromAccountId: string;
}
