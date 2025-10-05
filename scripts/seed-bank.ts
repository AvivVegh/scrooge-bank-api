// seed bank ledger with base cash amount of $250,000

// echo "Seeding bank ledger with base cash amount of $250,000"

// psql -d scrooge_bank -c "INSERT INTO bank_ledger (kind, amount_cents, memo) VALUES ('base_cash', 25000000, 'Initial capitalization ($250,000)')"

// echo "Bank ledger seeded with base cash amount of $250,000"

import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT ?? '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

if (!process.env.BANK_BASE_CASH_AMOUNT) {
  throw new Error('BASE_CASH_AMOUNT is not set');
}

const amountCents = parseInt(process.env.BANK_BASE_CASH_AMOUNT!) * 100;
const baseCashAmount = process.env.BANK_BASE_CASH_AMOUNT;

dataSource.initialize().then(async () => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.query(
    `INSERT INTO bank_ledger (kind, amount_cents, memo) VALUES ('base_cash', ${amountCents}, 'Initial capitalization (${baseCashAmount})')`,
  );
  await queryRunner.release();
  await dataSource.destroy();
});
