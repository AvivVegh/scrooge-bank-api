import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CanApproveLoanQueryDto {
  @ApiProperty({
    description: 'Amount to approve loan',
    example: 100000,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsPositive({ message: 'Amount must be positive' })
  amount: number;
}
