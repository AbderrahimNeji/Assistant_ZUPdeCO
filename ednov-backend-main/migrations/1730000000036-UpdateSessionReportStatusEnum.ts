import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSessionReportStatusEnum1730000000036 implements MigrationInterface {
  name = 'UpdateSessionReportStatusEnum1730000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing CHECK constraint if exists
    await queryRunner.query(`
      ALTER TABLE session_reports 
      DROP CONSTRAINT IF EXISTS session_reports_status_check
    `);

    // Add new CHECK constraint with all 5 statuses including 'to_complete'
    await queryRunner.query(`
      ALTER TABLE session_reports 
      ADD CONSTRAINT session_reports_status_check 
      CHECK (status IN ('to_complete', 'draft', 'submitted', 'validated', 'overdue'))
    `);

    // Update default value to 'to_complete'
    await queryRunner.query(`
      ALTER TABLE session_reports 
      ALTER COLUMN status SET DEFAULT 'to_complete'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Update reports with 'to_complete' to 'draft'
    await queryRunner.query(`
      UPDATE session_reports 
      SET status = 'draft' 
      WHERE status = 'to_complete'
    `);

    // Reset default value
    await queryRunner.query(`
      ALTER TABLE session_reports 
      ALTER COLUMN status SET DEFAULT 'draft'
    `);

    // Drop existing CHECK constraint
    await queryRunner.query(`
      ALTER TABLE session_reports 
      DROP CONSTRAINT IF EXISTS session_reports_status_check
    `);

    // Re-add CHECK constraint without 'to_complete'
    await queryRunner.query(`
      ALTER TABLE session_reports 
      ADD CONSTRAINT session_reports_status_check 
      CHECK (status IN ('draft', 'submitted', 'validated', 'overdue'))
    `);
  }
}
