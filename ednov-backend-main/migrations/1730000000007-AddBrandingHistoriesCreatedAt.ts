import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds created_at to branding_histories so the table matches CreateOnlyBaseEntity
 * (id + created_at). The entity BrandingHistory extends CreateOnlyBaseEntity and
 * expects this column.
 */
export class AddBrandingHistoriesCreatedAt1730000000007 implements MigrationInterface {
  name = 'AddBrandingHistoriesCreatedAt1730000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE branding_histories
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE branding_histories DROP COLUMN IF EXISTS created_at
    `);
  }
}
