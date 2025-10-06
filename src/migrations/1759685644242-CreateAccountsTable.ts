import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountsTable1759685644242 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE account_status AS ENUM ('open', 'closed');
            CREATE TABLE accounts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
                status account_status NOT NULL DEFAULT 'open',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                closed_at TIMESTAMP NULL
            );

            CREATE UNIQUE INDEX idx_accounts_user_id ON accounts (user_id) WHERE status = 'open';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE accounts;
        DROP TYPE account_status;
        DROP TYPE account_type;
        DROP INDEX idx_accounts_user_id;
    `);
  }
}
