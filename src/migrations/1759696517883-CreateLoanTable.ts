import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoansTable1759696517883 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE loan_status AS ENUM ('pending', 'approved', 'rejected');
      CREATE TABLE loans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        principal_cents BIGINT NOT NULL CHECK (principal_cents > 0),
        status loan_status NOT NULL DEFAULT 'pending',
        reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        decision_at TIMESTAMP NULL
      );
      CREATE INDEX idx_loans_user_id ON loans (user_id);
      CREATE INDEX idx_loans_status ON loans (status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_loans_user_id;
      DROP INDEX idx_loans_status;
      DROP TABLE loans;
      DROP TYPE loan_status;
    `);
  }
}
