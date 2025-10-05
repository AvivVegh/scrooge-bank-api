import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoanDisbursementsTable1759696974361 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE loan_disbursements (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
                amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE INDEX idx_loan_disbursements_loan_id ON loan_disbursements (loan_id);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_loan_disbursements_loan_id;
      DROP TABLE loan_disbursements;
    `);
  }
}
