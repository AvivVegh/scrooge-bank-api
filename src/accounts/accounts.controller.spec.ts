import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus } from '../entities/account.entity';
import { LoanStatus } from '../entities/loan.entity';
import { TransactionType } from '../entities/transaction.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { CloseAccountDto } from './dto/close-account.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { GetAccountStatementDto } from './dto/get-account-statement.dto';
import { GetAccountDto } from './dto/get-account.dto';
import { WithdrawDto } from './dto/withdraw.dto';

describe('AccountsController', () => {
  let controller: AccountsController;

  const mockAccountsService = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findAllAccounts: jest.fn(),
    getAccountStatement: jest.fn(),
    closeAccount: jest.fn(),
    deposit: jest.fn(),
    withdraw: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: mockAccountsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AccountsController>(AccountsController);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new account', async () => {
      const userId = 'test-user-id';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const mockAccount = {
        id: 'account-id',
        userId,
        balanceCents: 0,
        status: AccountStatus.OPEN,
        createdAt: new Date(),
        closedAt: null,
      };

      mockAccountsService.create.mockResolvedValue(mockAccount);

      const result = await controller.create(mockRequest);

      expect(mockAccountsService.create).toHaveBeenCalledWith({ userId });
      expect(result).toEqual(mockAccount);
    });
  });

  describe('getAccount', () => {
    it('should get account by ID', async () => {
      const accountId = 'test-account-id';
      const getAccountDto: GetAccountDto = { accountId };

      const mockAccount = {
        id: accountId,
        userId: 'user-id',
        balanceCents: 50000,
        status: AccountStatus.OPEN,
        createdAt: new Date(),
        closedAt: null,
      };

      mockAccountsService.findByUserId.mockResolvedValue(mockAccount);

      const result = await controller.getAccount(getAccountDto);

      expect(mockAccountsService.findByUserId).toHaveBeenCalledWith({ accountId });
      expect(result).toEqual(mockAccount);
    });
  });

  describe('getAllAccounts', () => {
    it('should get all accounts for a user', async () => {
      const userId = 'test-user-id';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const mockAccounts = [
        {
          id: 'account-1',
          userId,
          balanceCents: 10000,
          status: AccountStatus.OPEN,
          createdAt: new Date(),
          closedAt: null,
        },
      ];

      mockAccountsService.findAllAccounts.mockResolvedValue(mockAccounts);

      const result = await controller.getAllAccounts(mockRequest);

      expect(mockAccountsService.findAllAccounts).toHaveBeenCalledWith({ userId });
      expect(result).toEqual(mockAccounts);
    });

    it('should return empty array when no accounts exist', async () => {
      const userId = 'test-user-id';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      mockAccountsService.findAllAccounts.mockResolvedValue([]);

      const result = await controller.getAllAccounts(mockRequest);

      expect(mockAccountsService.findAllAccounts).toHaveBeenCalledWith({ userId });
      expect(result).toEqual([]);
    });
  });

  describe('getAccountBalance', () => {
    it('should get account statement with date range', async () => {
      const accountId = 'test-account-id';
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      const getAccountDto: GetAccountDto = { accountId };
      const getAccountStatementDto: GetAccountStatementDto = {
        fromDate,
        toDate,
      };

      const mockStatement = {
        balance: 500,
        loans: [
          {
            id: 'loan-1',
            userId: 'user-id',
            status: LoanStatus.APPROVED,
            principalCents: 100000,
          },
        ],
        transactions: [
          {
            id: 'tx-1',
            type: TransactionType.DEPOSIT,
            amountCents: 10000,
            createdAt: new Date('2024-06-01'),
          },
        ],
      };

      mockAccountsService.getAccountStatement.mockResolvedValue(mockStatement);

      const result = await controller.getAccountBalance(getAccountStatementDto, getAccountDto);

      expect(mockAccountsService.getAccountStatement).toHaveBeenCalledWith({
        accountId,
        fromDate,
        toDate,
      });
      expect(result).toEqual(mockStatement);
    });
  });

  describe('closeAccount', () => {
    it('should close an account', async () => {
      const userId = 'test-user-id';
      const accountId = 'test-account-id';
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const closeAccountDto: CloseAccountDto = { accountId };

      const mockClosedAccount = {
        id: accountId,
        userId,
        balanceCents: 0,
        status: AccountStatus.CLOSED,
        createdAt: new Date(),
        closedAt: new Date(),
      };

      mockAccountsService.closeAccount.mockResolvedValue(mockClosedAccount);

      const result = await controller.closeAccount(closeAccountDto, mockRequest);

      expect(mockAccountsService.closeAccount).toHaveBeenCalledWith({
        userId,
        accountId,
      });
      expect(result).toEqual(mockClosedAccount);
      expect(result.status).toBe(AccountStatus.CLOSED);
    });
  });

  describe('deposit', () => {
    it('should deposit funds successfully', async () => {
      const userId = 'test-user-id';
      const accountId = 'test-account-id';
      const amount = 100;
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const depositDto: CreateDepositDto = {
        accountId,
        amount,
        idempotencyKey: 'unique-key-123',
      };

      const mockDepositResult = {
        transactionId: 'transaction-id',
        accountId,
        newBalanceCents: 15000,
        createdAt: new Date(),
      };

      mockAccountsService.deposit.mockResolvedValue(mockDepositResult);

      const result = await controller.deposit(depositDto, mockRequest);

      expect(mockAccountsService.deposit).toHaveBeenCalledWith({
        userId,
        accountId,
        amount,
        idempotencyKey: 'unique-key-123',
      });
      expect(result).toEqual(mockDepositResult);
      expect(result.transactionId).toBe('transaction-id');
      expect(result.newBalanceCents).toBe(15000);
    });

    it('should deposit without idempotency key', async () => {
      const userId = 'test-user-id';
      const accountId = 'test-account-id';
      const amount = 50;
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const depositDto: CreateDepositDto = {
        accountId,
        amount,
      };

      const mockDepositResult = {
        transactionId: 'transaction-id',
        accountId,
        newBalanceCents: 10000,
        createdAt: new Date(),
      };

      mockAccountsService.deposit.mockResolvedValue(mockDepositResult);

      const result = await controller.deposit(depositDto, mockRequest);

      expect(mockAccountsService.deposit).toHaveBeenCalledWith({
        userId,
        accountId,
        amount,
        idempotencyKey: undefined,
      });
      expect(result).toEqual(mockDepositResult);
    });
  });

  describe('withdraw', () => {
    it('should withdraw funds successfully', async () => {
      const userId = 'test-user-id';
      const accountId = 'test-account-id';
      const amount = 50;
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const withdrawDto: WithdrawDto = {
        accountId,
        amount,
        idempotencyKey: 'unique-key-456',
      };

      const mockWithdrawResult = {
        transactionId: 'transaction-id',
        accountId,
        newBalanceCents: 5000,
        createdAt: new Date(),
      };

      mockAccountsService.withdraw.mockResolvedValue(mockWithdrawResult);

      const result = await controller.withdraw(withdrawDto, mockRequest);

      expect(mockAccountsService.withdraw).toHaveBeenCalledWith({
        accountId,
        amount,
        userId,
        idempotencyKey: 'unique-key-456',
      });
      expect(result).toEqual(mockWithdrawResult);
      expect(result.transactionId).toBe('transaction-id');
      expect(result.newBalanceCents).toBe(5000);
    });

    it('should withdraw without idempotency key', async () => {
      const userId = 'test-user-id';
      const accountId = 'test-account-id';
      const amount = 25;
      const mockRequest = {
        user: { userId },
      } as Request & { user: { userId: string } };

      const withdrawDto: WithdrawDto = {
        accountId,
        amount,
      };

      const mockWithdrawResult = {
        transactionId: 'transaction-id',
        accountId,
        newBalanceCents: 7500,
        createdAt: new Date(),
      };

      mockAccountsService.withdraw.mockResolvedValue(mockWithdrawResult);

      const result = await controller.withdraw(withdrawDto, mockRequest);

      expect(mockAccountsService.withdraw).toHaveBeenCalledWith({
        accountId,
        amount,
        userId,
        idempotencyKey: undefined,
      });
      expect(result).toEqual(mockWithdrawResult);
    });
  });
});
