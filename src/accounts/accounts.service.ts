import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountsEntity, AccountStatus, AccountType } from './entities/accounts.entity';
@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(AccountsEntity)
    private accountsRepository: Repository<AccountsEntity>,
  ) {}

  async create({ userId, accountType }: { userId: string; accountType: AccountType }) {
    // Check if account of this type already exists for the user
    const existingAccount = await this.accountsRepository.findOne({
      where: { userId, type: accountType },
    });

    if (existingAccount) {
      throw new ConflictException(`Account of type ${accountType} already exists for this user`);
    }

    // Create new account
    const account = this.accountsRepository.create({
      userId,
      balanceCents: 0,
      status: AccountStatus.OPEN,
      type: accountType,
    });

    return await this.accountsRepository.save(account);
  }

  async findByUserId({ accountId }: { accountId: string }) {
    const account = await this.accountsRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async findAllAccounts({ userId }: { userId: string }) {
    return this.accountsRepository.find({
      where: { status: AccountStatus.OPEN, userId },
    });
  }

  async closeAccount({ accountId }: { accountId: string }) {
    const account = await this.accountsRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    account.status = AccountStatus.CLOSED;
    account.closedAt = new Date();
    return await this.accountsRepository.save(account);
  }
}
