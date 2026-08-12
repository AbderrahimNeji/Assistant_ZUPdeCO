import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentFieldsToUserProfiles1730000000034 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add date_of_birth column
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "date_of_birth" VARCHAR(10) NULL;
    `);

    // Add gender column
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "gender" VARCHAR(1) NULL CHECK ("gender" IN ('M', 'F', 'O'));
    `);

    // Add address column
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "address" VARCHAR(200) NULL;
    `);

    // Add level_id column (FK to levels table)
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "level_id" UUID NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD CONSTRAINT "fk_user_profiles_level"
      FOREIGN KEY ("level_id")
      REFERENCES "levels"("id")
      ON DELETE SET NULL;
    `);

    // Add medical_notes column
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "medical_notes" VARCHAR(500) NULL;
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX "idx_user_profiles_level_id" ON "user_profiles" ("level_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_profiles_gender" ON "user_profiles" ("gender");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_profiles_gender";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_profiles_level_id";`);

    // Drop FK constraint
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP CONSTRAINT IF EXISTS "fk_user_profiles_level";
    `);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "medical_notes";`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "level_id";`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "address";`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "gender";`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "date_of_birth";`);
  }
}
