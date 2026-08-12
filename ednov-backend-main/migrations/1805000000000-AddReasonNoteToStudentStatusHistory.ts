import { MigrationInterface, QueryRunner } from 'typeorm';

/** POC-466 — Précision du motif de sortie lorsque reason = 'Autre'. */
export class AddReasonNoteToStudentStatusHistory1805000000000 implements MigrationInterface {
  name = 'AddReasonNoteToStudentStatusHistory1805000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_status_history"
        ADD COLUMN IF NOT EXISTS "reason_note" VARCHAR(200) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_status_history"
        DROP COLUMN IF EXISTS "reason_note";
    `);
  }
}
