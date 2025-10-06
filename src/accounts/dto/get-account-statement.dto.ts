import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class GetAccountStatementDto {
  @ApiProperty({
    description: 'From date',
    example: '2021-01-01',
  })
  @IsDateString({}, { message: 'From date must be a date' })
  @IsNotEmpty({ message: 'From date is required' })
  fromDate: Date;

  @ApiProperty({
    description: 'To date',
    example: '2021-01-01',
  })
  @IsDateString({}, { message: 'To date must be a date' })
  @IsNotEmpty({ message: 'To date is required' })
  toDate: Date;
}
