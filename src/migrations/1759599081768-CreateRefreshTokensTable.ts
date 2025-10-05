import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1759599081768 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        jti UUID NOT NULL,
        token_hash TEXT NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
      CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens (jti);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE refresh_tokens;
      DROP INDEX idx_refresh_tokens_user_id;
      DROP INDEX idx_refresh_tokens_jti;
    `);
  }
}
