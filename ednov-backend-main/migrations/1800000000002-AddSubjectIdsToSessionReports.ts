import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ajoute subject_ids (jsonb) sur session_reports, aligné sur les sessions.
 * La colonne `subject` (varchar) est conservée (dénormalisation / rétrocompat).
 */
export class AddSubjectIdsToSessionReports1800000000002 implements MigrationInterface {
  name = 'AddSubjectIdsToSessionReports1800000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_reports"
      ADD COLUMN IF NOT EXISTS "subject_ids" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_reports"
      DROP COLUMN IF EXISTS "subject_ids"
    `);
  }
}
