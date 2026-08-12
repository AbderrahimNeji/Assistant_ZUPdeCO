import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHasSpecialNeedsToUserProfiles1743523200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "has_special_needs" BOOLEAN NULL DEFAULT FALSE;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_profiles_has_special_needs" ON "user_profiles" ("has_special_needs");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_profiles_has_special_needs";`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "has_special_needs";`);
  }
}
