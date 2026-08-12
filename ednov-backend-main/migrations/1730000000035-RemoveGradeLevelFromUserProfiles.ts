import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveGradeLevelFromUserProfiles1730000000035 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP COLUMN IF EXISTS "grade_level";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "grade_level" VARCHAR(50) NULL;
    `);
  }
}
