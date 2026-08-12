import { MigrationInterface, QueryRunner } from 'typeorm';

/** Tutor sentiment during the session (mobile / web CR). */
export class SessionReportFeeling1802000000000 implements MigrationInterface {
  name = 'SessionReportFeeling1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_reports"
      ADD COLUMN IF NOT EXISTS "feeling" character varying(32) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_reports"
      DROP COLUMN IF EXISTS "feeling"
    `);
  }
}
