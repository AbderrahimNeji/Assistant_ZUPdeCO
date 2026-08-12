import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExitReasonAndNoteToUserProfiles1805000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN IF NOT EXISTS "exit_reason" VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS "exit_reason_note" VARCHAR(200) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP COLUMN IF EXISTS "exit_reason",
      DROP COLUMN IF EXISTS "exit_reason_note";
    `);
  }
}
