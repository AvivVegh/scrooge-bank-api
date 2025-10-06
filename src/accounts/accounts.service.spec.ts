import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccountEntity, AccountStatus } from '../entities/account.entity';
import { BankLedgerEntity, BankLedgerKind } from '../entities/bank-ledger.entity';
import { LoanEntity, LoanStatus } from '../entities/loan.entity';
import { TransactionEntity, TransactionType } from '../entities/transaction.entity';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  let service: AccountsService;
  let accountRepository: jest.Mocked<Repository<AccountEntity>>;
  let dataSource: jest.Mocked<DataSource>;

  // Mock transaction manager
  const mockTransactionManager = {
    getRepository: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(cb => cb(mockTransactionManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(AccountEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    accountRepository = module.get(getRepositoryToken(AccountEntity));
    dataSource = module.get(DataSource);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'test-user-id';

    it('should create a new account successfully', async () => {
      const newAccount = {
        id: 'account-id',
        userId,
        balanceCents: 0,
        status: AccountStatus.OPEN,
        createdAt: new Date(),
        closedAt: null,
      };

      accountRepository.findOne.mockResolvedValue(null);
      accountRepository.create.mockReturnValue(newAccount as any);
      accountRepository.save.mockResolvedValue(newAccount as any);

      const result = await service.create({ userId });

      expect(accountRepository.findOne).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(accountRepository.create).toHaveBeenCalledWith({
        userId,
        balanceCents: 0,
        status: AccountStatus.OPEN,
      });
      expect(accountRepository.save).toHaveBeenCalledWith(newAccount);
      expect(result).toEqual(newAccount);
    });

    it('should throw ConflictException if account already exists', async () => {
      const existingAccount = {
        id: 'existing-account-id',
        userId,
        balanceCents: 1000,
        status: AccountStatus.OPEN,
      };

      accountRepository.findOne.mockResolvedValue(existingAccount as any);

      await expect(service.create({ userId })).rejects.toThrow(ConflictException);
      await expect(service.create({ userId })).rejects.toThrow(
        'Account already exists for this user',
      );
      expect(accountRepository.create).not.toHaveBeenCalled();
      expect(accountRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    const accountId = 'test-account-id';

    it('should return an account by ID', async () => {
      const account = {
        id: accountId,
        userId: 'user-id',
        balanceCents: 5000,
        status: AccountStatus.OPEN,
        createdAt: new Date(),
        closedAt: null,
      };

      accountRepository.findOne.mockResolvedValue(account as any);

      const result = await service.findByUserId({ accountId });

      expect(accountRepository.findOne).toHaveBeenCalledWith({
        where: { id: accountId, status: AccountStatus.OPEN },
      });
      expect(result).toEqual(account);
    });

    it('should throw NotFoundException if account not found', async () => {
      accountRepository.findOne.mockResolvedValue(null);

      await expect(service.findByUserId({ accountId })).rejects.toThrow(NotFoundException);
      await expect(service.findByUserId({ accountId })).rejects.toThrow('Account not found');
    });
  });

  describe('findAllAccounts', () => {
    const userId = 'test-user-id';

    it('should return all open accounts for a user', async () => {
      const accounts = [
        {
          id: 'account-1',
          userId,
          balanceCents: 1000,
          status: AccountStatus.OPEN,
        },
      ];

      accountRepository.find.mockResolvedValue(accounts as any);

      const result = await service.findAllAccounts({ userId });

      expect(accountRepository.find).toHaveBeenCalledWith({
        where: { status: AccountStatus.OPEN, userId },
      });
      expect(result).toEqual(accounts);
    });

    it('should return empty array if no accounts found', async () => {
      accountRepository.find.mockResolvedValue([]);

      const result = await service.findAllAccounts({ userId });

      expect(result).toEqual([]);
    });
  });

  describe('closeAccount', () => {
    const userId = 'test-user-id';
    const accountId = 'test-account-id';

    it('should close an account successfully', async () => {
      const account = {
        id: accountId,
        userId,
        balanceCents: 0,
        status: AccountStatus.OPEN,
        createdAt: new Date(),
        closedAt: null,
      };

      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(account),
        save: jest.fn().mockResolvedValue({ ...account, status: AccountStatus.CLOSED }),
      };

      const mockLoanRepo = {
        find: jest.fn().mockResolvedValue([]),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === LoanEntity) return mockLoanRepo;
        return null;
      });

      const result = await service.closeAccount({ userId, accountId });

      expect(mockAccountRepo.findOne).toHaveBeenCalledWith({
        where: { id: accountId, status: AccountStatus.OPEN },
      });
      expect(mockLoanRepo.find).toHaveBeenCalledWith({
        where: { userId, status: LoanStatus.APPROVED },
      });
      expect(result.status).toBe(AccountStatus.CLOSED);
    });

    it('should throw NotFoundException if account not found', async () => {
      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockTransactionManager.getRepository.mockReturnValue(mockAccountRepo);

      await expect(service.closeAccount({ userId, accountId })).rejects.toThrow(NotFoundException);
      await expect(service.closeAccount({ userId, accountId })).rejects.toThrow(
        'Account not found',
      );
    });

    it('should throw BadRequestException if account has outstanding loans', async () => {
      const account = {
        id: accountId,
        userId,
        balanceCents: 0,
        status: AccountStatus.OPEN,
      };

      const loans = [
        {
          id: 'loan-1',
          userId,
          status: LoanStatus.APPROVED,
          principalCents: 10000,
        },
      ];

      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(account),
      };

      const mockLoanRepo = {
        find: jest.fn().mockResolvedValue(loans),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === LoanEntity) return mockLoanRepo;
        return null;
      });

      await expect(service.closeAccount({ userId, accountId })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.closeAccount({ userId, accountId })).rejects.toThrow(
        'Account has loans and cannot be closed',
      );
    });

    it('should throw BadRequestException if account has positive balance', async () => {
      const account = {
        id: accountId,
        userId,
        balanceCents: 5000,
        status: AccountStatus.OPEN,
      };

      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(account),
      };

      const mockLoanRepo = {
        find: jest.fn().mockResolvedValue([]),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === LoanEntity) return mockLoanRepo;
        return null;
      });

      await expect(service.closeAccount({ userId, accountId })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.closeAccount({ userId, accountId })).rejects.toThrow(
        'Account has money and cannot be closed',
      );
    });
  });

  describe('deposit', () => {
    const userId = 'test-user-id';
    const accountId = 'test-account-id';
    const amount = 100;
    const amountCents = 10000;

    it('should deposit funds successfully', async () => {
      const account = {
        id: accountId,
        userId,
        balanceCents: 5000,
        status: AccountStatus.OPEN,
      };

      const transaction = {
        id: 'transaction-id',
        account: { id: accountId },
        type: TransactionType.DEPOSIT,
        amountCents,
        createdAt: new Date(),
      };

      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(account),
        save: jest.fn().mockResolvedValue({ ...account, balanceCents: 15000 }),
      };

      const mockTransactionRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(transaction),
      };

      const mockLedgerRepo = {
        save: jest.fn().mockResolvedValue({}),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === TransactionEntity) return mockTransactionRepo;
        if (entity === BankLedgerEntity) return mockLedgerRepo;
        return null;
      });

      const result = await service.deposit({ userId, accountId, amount });

      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('accountId');
      expect(result).toHaveProperty('newBalanceCents');
      expect(mockTransactionRepo.save).toHaveBeenCalled();
      expect(mockAccountRepo.save).toHaveBeenCalled();
      expect(mockLedgerRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for zero or negative amount', async () => {
      await expect(service.deposit({ userId, accountId, amount: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deposit({ userId, accountId, amount: 0 })).rejects.toThrow(
        'Amount must be greater than 0',
      );

      await expect(service.deposit({ userId, accountId, amount: -50 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if account not found', async () => {
      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockTransactionManager.getRepository.mockReturnValue(mockAccountRepo);

      await expect(service.deposit({ userId, accountId, amount })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle idempotency - return existing transaction if key reused', async () => {
      const idempotencyKey = 'unique-key-123';
      const existingTransaction = {
        id: 'existing-transaction-id',
        account: { id: accountId },
        type: TransactionType.DEPOSIT,
        amountCents,
        idempotencyKey,
        createdAt: new Date('2024-01-01'),
      };

      const account = {
        id: accountId,
        userId,
        balanceCents: 15000,
        status: AccountStatus.OPEN,
      };

      const mockAccountRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(account)
          .mockResolvedValueOnce(account)
          .mockResolvedValue(account),
        findOneByOrFail: jest.fn().mockResolvedValue(account),
        save: jest.fn(),
      };

      const mockTransactionRepo = {
        findOne: jest.fn().mockResolvedValue(existingTransaction),
        save: jest.fn(),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === TransactionEntity) return mockTransactionRepo;
        return null;
      });

      const result = await service.deposit({ userId, accountId, amount, idempotencyKey });

      expect(result.transactionId).toBe(existingTransaction.id);
      expect(mockTransactionRepo.save).not.toHaveBeenCalled();
      expect(mockAccountRepo.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if idempotency key used with different amount', async () => {
      const idempotencyKey = 'unique-key-123';
      const existingTransaction = {
        id: 'existing-transaction-id',
        account: { id: accountId },
        type: TransactionType.DEPOSIT,
        amountCents: 5000, // Different amount
        idempotencyKey,
        createdAt: new Date(),
      };

      const account = {
        id: accountId,
        userId,
        balanceCents: 10000,
        status: AccountStatus.OPEN,
      };

      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(account),
      };

      const mockTransactionRepo = {
        findOne: jest.fn().mockResolvedValue(existingTransaction),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === TransactionEntity) return mockTransactionRepo;
        return null;
      });

      await expect(service.deposit({ userId, accountId, amount, idempotencyKey })).rejects.toThrow(
        ConflictException,
      );
      await expect(service.deposit({ userId, accountId, amount, idempotencyKey })).rejects.toThrow(
        'Idempotency key already used with a different operation/amount',
      );
    });
  });

  describe('withdraw', () => {
    const userId = 'test-user-id';
    const accountId = 'test-account-id';
    const amount = 50;
    const amountCents = 5000;

    it('should withdraw funds successfully', async () => {
      const account = {
        id: accountId,
        userId,
        balanceCents: 10000,
        status: AccountStatus.OPEN,
      };

      const transaction = {
        id: 'transaction-id',
        account: { id: accountId },
        type: TransactionType.WITHDRAWAL,
        amountCents,
        createdAt: new Date(),
      };

      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(account),
        save: jest.fn().mockResolvedValue({ ...account, balanceCents: 5000 }),
      };

      const mockTransactionRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(transaction),
      };

      const mockLedgerRepo = {
        save: jest.fn().mockResolvedValue({}),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === TransactionEntity) return mockTransactionRepo;
        if (entity === BankLedgerEntity) return mockLedgerRepo;
        return null;
      });

      const result = await service.withdraw({ userId, accountId, amount });

      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('accountId');
      expect(result).toHaveProperty('newBalanceCents');
      expect(mockTransactionRepo.save).toHaveBeenCalled();
      expect(mockAccountRepo.save).toHaveBeenCalled();
      expect(mockLedgerRepo.save).toHaveBeenCalledWith({
        kind: BankLedgerKind.WITHDRAWAL,
        amountCents: -amountCents,
        transaction: { id: transaction.id },
      });
    });

    it('should throw BadRequestException if insufficient funds', async () => {
      const account = {
        id: accountId,
        userId,
        balanceCents: 2000, // Less than withdrawal amount
        status: AccountStatus.OPEN,
      };

      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(account),
      };

      const mockTransactionRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === TransactionEntity) return mockTransactionRepo;
        return null;
      });

      await expect(service.withdraw({ userId, accountId, amount })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.withdraw({ userId, accountId, amount })).rejects.toThrow(
        'Insufficient funds',
      );
    });

    it('should throw BadRequestException for zero or negative amount', async () => {
      await expect(service.withdraw({ userId, accountId, amount: 0 })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.withdraw({ userId, accountId, amount: -50 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if account not found', async () => {
      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const mockTransactionRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === TransactionEntity) return mockTransactionRepo;
        return null;
      });

      await expect(service.withdraw({ userId, accountId, amount })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAccountStatement', () => {
    const accountId = 'test-account-id';
    const fromDate = new Date('2024-01-01');
    const toDate = new Date('2024-12-31');

    it('should return account statement with balance, loans, and transactions', async () => {
      const account = {
        id: accountId,
        userId: 'user-id',
        balanceCents: 50000,
        status: AccountStatus.OPEN,
      };

      const loans = [
        {
          id: 'loan-1',
          userId: 'user-id',
          status: LoanStatus.APPROVED,
          principalCents: 100000,
        },
      ];

      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.DEPOSIT,
          amountCents: 10000,
        },
      ];

      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(account),
      };

      const mockLoanRepo = {
        find: jest.fn().mockResolvedValue(loans),
      };

      const mockTransactionRepo = {
        find: jest.fn().mockResolvedValue(transactions),
      };

      mockTransactionManager.getRepository.mockImplementation(entity => {
        if (entity === AccountEntity) return mockAccountRepo;
        if (entity === LoanEntity) return mockLoanRepo;
        if (entity === TransactionEntity) return mockTransactionRepo;
        return null;
      });

      const result = await service.getAccountStatement({ accountId, fromDate, toDate });

      expect(result).toHaveProperty('balance', 500);
      expect(result).toHaveProperty('loans');
      expect(result).toHaveProperty('transactions');
      expect(result.loans).toEqual(loans);
      expect(result.transactions).toEqual(transactions);
    });

    it('should throw NotFoundException if account not found', async () => {
      const mockAccountRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockTransactionManager.getRepository.mockReturnValue(mockAccountRepo);

      await expect(service.getAccountStatement({ accountId, fromDate, toDate })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
