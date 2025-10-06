import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoanPaymentIdDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Payment ID must be a string' })
  @IsNotEmpty({ message: 'Payment ID is required' })
  paymentId: string;
}
