import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * User-establishment link (Option A): users belong to one or more establishments.
 * Used for assignment candidates (same establishment as session).
 */
export class UserEstablishments1730000000020 implements MigrationInterface {
  name = 'UserEstablishments1730000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_establishments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        establishment_id UUID NOT NULL REFERENCES establishments (id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_user_establishment UNIQUE (user_id, establishment_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_user_establishments_establishment_id ON user_establishments (establishment_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_user_establishments_company_id ON user_establishments (company_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_establishments_company_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_establishments_establishment_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_establishments`);
  }
}
