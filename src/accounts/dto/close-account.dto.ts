import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CloseAccountDto {
  @ApiProperty({
    description: 'Account ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: 'Account ID must be a string' })
  @IsNotEmpty({ message: 'Account ID is required' })
  accountId: string;
}
