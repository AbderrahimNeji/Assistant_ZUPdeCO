import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add script column to session_reports for AI-generated Tuteur/Élève dialogue.
 */
export class SessionReportScript1730000000023 implements MigrationInterface {
  name = 'SessionReportScript1730000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE session_reports ADD COLUMN script text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE session_reports DROP COLUMN script`);
  }
}
