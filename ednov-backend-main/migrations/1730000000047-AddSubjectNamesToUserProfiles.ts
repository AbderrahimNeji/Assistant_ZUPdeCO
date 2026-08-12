import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add subject_names column to user_profiles for storing denormalized subject names.
 * This avoids the need to join with subjects table when displaying volunteer subjects.
 */
export class AddSubjectNamesToUserProfiles1730000000047 implements MigrationInterface {
  name = 'AddSubjectNamesToUserProfiles1730000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add subject_names column to user_profiles
    await queryRunner.query(`
      ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS subject_names JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove subject_names column from user_profiles
    await queryRunner.query(`
      ALTER TABLE user_profiles
        DROP COLUMN IF EXISTS subject_names
    `);
  }
}
