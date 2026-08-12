import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeUaiCodeNullableAndDropUniqueIndex1802100000000 implements MigrationInterface {
  name = 'MakeUaiCodeNullableAndDropUniqueIndex1802100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique index on (company_id, uai_code)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_establishments_company_id_uai_code"
    `);

    // Also try the partial index variant (where deleted_at IS NULL)
    await queryRunner.query(`
      DO $$
      DECLARE
        idx_name TEXT;
      BEGIN
        SELECT indexname INTO idx_name
        FROM pg_indexes
        WHERE tablename = 'establishments'
          AND indexdef ILIKE '%uai_code%'
          AND indexdef ILIKE '%unique%';
        IF idx_name IS NOT NULL THEN
          EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_name);
        END IF;
      END $$;
    `);

    // Make uai_code nullable
    await queryRunner.query(`
      ALTER TABLE establishments
      ALTER COLUMN uai_code DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore NOT NULL (set empty string for existing NULLs first)
    await queryRunner.query(`
      UPDATE establishments SET uai_code = '' WHERE uai_code IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE establishments
      ALTER COLUMN uai_code SET NOT NULL
    `);

    // Recreate the unique partial index
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_establishments_company_id_uai_code"
      ON establishments (company_id, uai_code)
      WHERE deleted_at IS NULL
    `);
  }
}
