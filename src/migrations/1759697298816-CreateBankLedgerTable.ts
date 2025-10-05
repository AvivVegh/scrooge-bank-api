import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBankLedgerTable1759697298816 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE ledger_kind AS ENUM ('base_cash','deposit','withdrawal','loan_disbursed','loan_payment','adjustment');

            CREATE TABLE bank_ledger (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                amount_cents BIGINT NOT NULL,
                kind ledger_kind NOT NULL,
                occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
                transaction_id UUID NULL,
                loan_disbursement_id UUID NULL,
                loan_payment_id UUID NULL,
                memo TEXT
            );

            -- Foreign keys (audit trail -> don't cascade deletes)
            ALTER TABLE bank_ledger
                ADD CONSTRAINT bank_ledger_transaction_id_fkey
                    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
                ADD CONSTRAINT bank_ledger_loan_disbursement_id_fkey
                    FOREIGN KEY (loan_disbursement_id) REFERENCES loan_disbursements(id) ON DELETE RESTRICT,
                ADD CONSTRAINT bank_ledger_loan_payment_id_fkey
                    FOREIGN KEY (loan_payment_id) REFERENCES loan_payments(id) ON DELETE RESTRICT;

            -- Exactly one source reference per kind (or none for base_cash/adjustment)
            ALTER TABLE bank_ledger
            ADD CONSTRAINT chk_ledger_one_source CHECK (
                (kind IN ('deposit','withdrawal')
                AND transaction_id IS NOT NULL
                AND loan_disbursement_id IS NULL
                AND loan_payment_id IS NULL)
                OR
                (kind = 'loan_disbursed'
                AND transaction_id IS NULL
                AND loan_disbursement_id IS NOT NULL
                AND loan_payment_id IS NULL)
                OR
                (kind = 'loan_payment'
                AND transaction_id IS NULL
                AND loan_disbursement_id IS NULL
                AND loan_payment_id IS NOT NULL)
                OR
                (kind IN ('base_cash','adjustment')
                AND transaction_id IS NULL
                AND loan_disbursement_id IS NULL
                AND loan_payment_id IS NULL)
            );

            -- Indexes
            CREATE UNIQUE INDEX IF NOT EXISTS ux_ledger_single_base_cash
            ON bank_ledger((1)) WHERE kind = 'base_cash';

            CREATE INDEX IF NOT EXISTS ix_ledger_kind ON bank_ledger(kind);
            CREATE INDEX IF NOT EXISTS ix_ledger_time ON bank_ledger(occurred_at DESC);



        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX ix_ledger_kind;
      DROP INDEX ix_ledger_time;
      DROP INDEX ux_ledger_single_base_cash;
      DROP TABLE bank_ledger;
      DROP TYPE ledger_kind;
    `);
  }
}
