import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialNeedsTypeToUserProfiles1744700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "special_needs_type" VARCHAR(50) NULL,
      ADD COLUMN "special_needs_note" VARCHAR(200) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP COLUMN IF EXISTS "special_needs_type",
      DROP COLUMN IF EXISTS "special_needs_note";
    `);
  }
}
