import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionsTable1759685879421 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal');
            CREATE TABLE transactions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                type transaction_type NOT NULL,
                amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
                idempotency_key TEXT NOT NULL,
                created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE INDEX idx_account_idempotency_key ON transactions (account_id, idempotency_key) where idempotency_key IS NOT NULL;
            CREATE INDEX idx_account_created_at ON transactions (account_id, created_at DESC);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_account_idempotency_key;
      DROP INDEX idx_account_created_at;
      DROP TABLE transactions;
      DROP TYPE transaction_type;
    `);
  }
}
