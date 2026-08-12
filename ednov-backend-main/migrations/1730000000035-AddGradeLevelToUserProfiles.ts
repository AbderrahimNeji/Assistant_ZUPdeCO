import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns DB with UserProfile.gradeLevel (entity column grade_level).
 * Was missing from AddStudentFieldsToUserProfiles1730000000034.
 */
export class AddGradeLevelToUserProfiles1730000000035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN IF NOT EXISTS "grade_level" VARCHAR(50) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "grade_level";
    `);
  }
}
