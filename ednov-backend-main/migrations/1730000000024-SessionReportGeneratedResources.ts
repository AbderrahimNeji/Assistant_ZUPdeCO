import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add generated_resources column to session_reports for AI-generated pedagogical resources (title, problem, solution).
 */
export class SessionReportGeneratedResources1730000000024 implements MigrationInterface {
  name = 'SessionReportGeneratedResources1730000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE session_reports ADD COLUMN generated_resources jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE session_reports DROP COLUMN generated_resources`);
  }
}
