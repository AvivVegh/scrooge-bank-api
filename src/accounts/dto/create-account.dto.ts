import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { AccountType } from '../../entities/account.entity';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account type',
    example: AccountType.CHECKING,
  })
  @IsEnum(AccountType, { message: 'Invalid account type' })
  @IsNotEmpty({ message: 'Account type is required' })
  accountType: AccountType;
}
