import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionStatusHistoryCancellationMetadata1730000000039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_status_history"
      ADD COLUMN IF NOT EXISTS "reason_code" varchar(50) NULL,
      ADD COLUMN IF NOT EXISTS "reason_detail" text NULL,
      ADD COLUMN IF NOT EXISTS "dematch_mode" varchar(20) NULL,
      ADD COLUMN IF NOT EXISTS "removed_pairs_count" int NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_status_history"
      DROP COLUMN IF EXISTS "removed_pairs_count",
      DROP COLUMN IF EXISTS "dematch_mode",
      DROP COLUMN IF EXISTS "reason_detail",
      DROP COLUMN IF EXISTS "reason_code";
    `);
  }
}
