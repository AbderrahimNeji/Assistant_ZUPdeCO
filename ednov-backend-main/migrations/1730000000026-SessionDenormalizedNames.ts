import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add denormalized name columns to sessions for easier querying/display without joins.
 * All columns are nullable to avoid breaking existing sessions.
 */
export class SessionDenormalizedNames1730000000026 implements MigrationInterface {
  name = 'SessionDenormalizedNames1730000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions
        ADD COLUMN IF NOT EXISTS establishment_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS level_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS program_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS activity_name VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions
        DROP COLUMN IF EXISTS establishment_name,
        DROP COLUMN IF EXISTS subject_name,
        DROP COLUMN IF EXISTS level_name,
        DROP COLUMN IF EXISTS program_name,
        DROP COLUMN IF EXISTS activity_name
    `);
  }
}
