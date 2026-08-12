import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultPostItsColumns1745582954000 implements MigrationInterface {
  name = 'AddDefaultPostItsColumns1745582954000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new ENUM values for thematic
    await queryRunner.query(`
      ALTER TYPE post_it_thematic ADD VALUE IF NOT EXISTS 'formation';
    `);
    
    await queryRunner.query(`
      ALTER TYPE post_it_thematic ADD VALUE IF NOT EXISTS 'rapport_activite';
    `);

    // Add new columns to post_its table
    await queryRunner.query(`
      ALTER TABLE post_its
        ADD COLUMN visible_from TIMESTAMPTZ NULL,
        ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN default_post_it_key VARCHAR(100) NULL;
    `);

    // Create unique index to prevent duplicate default post-its
    // Same user + same template key + same deadline = duplicate
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_post_its_default_key
        ON post_its (created_by_id, default_post_it_key, deadline)
        WHERE is_default = true
          AND default_post_it_key IS NOT NULL
          AND deleted_at IS NULL;
    `);

    // Create index on visible_from for filtering performance
    await queryRunner.query(`
      CREATE INDEX idx_post_its_visible_from
        ON post_its(visible_from)
        WHERE visible_from IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_its_visible_from;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_its_default_key;`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE post_its
        DROP COLUMN IF EXISTS default_post_it_key,
        DROP COLUMN IF EXISTS is_default,
        DROP COLUMN IF EXISTS visible_from;
    `);

    // Note: Cannot remove ENUM values in PostgreSQL without recreating the type
    // This would require dropping all dependencies, which is not safe
    // The new ENUM values will remain in the database
  }
}
