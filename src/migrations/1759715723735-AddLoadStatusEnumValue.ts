import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoadStatusEnumValue1759715723735 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TYPE loan_status ADD VALUE 'closed';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TYPE loan_status DROP VALUE 'closed';
        `);
  }
}
