import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColLoanEntityClientKey1759705764196 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE loans ADD COLUMN client_key TEXT NULL;
            CREATE INDEX idx_loans_client_key ON loans (client_key);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX idx_loans_client_key;
            ALTER TABLE loans DROP COLUMN client_key;
        `);
  }
}
