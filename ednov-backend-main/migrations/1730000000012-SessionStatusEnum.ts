import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Session status enum: PLANNED (default), IN_PROGRESS, COMPLETED, CLOSED, CANCELLED.
 * Migrates existing lowercase values to uppercase and sets default to PLANNED.
 */
export class SessionStatusEnum1730000000012 implements MigrationInterface {
  name = 'SessionStatusEnum1730000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop constraint first so UPDATE can write new values
    await queryRunner.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check`,
    );
    await queryRunner.query(`
      UPDATE sessions
      SET status = CASE status
        WHEN 'planned'      THEN 'PLANNED'
        WHEN 'in_progress' THEN 'IN_PROGRESS'
        WHEN 'completed'   THEN 'COMPLETED'
        WHEN 'closed'      THEN 'CLOSED'
        WHEN 'cancelled'   THEN 'CANCELLED'
        ELSE status
      END
    `);
    await queryRunner.query(`
      ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
        CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'))
    `);
    await queryRunner.query(`
      ALTER TABLE sessions ALTER COLUMN status SET DEFAULT 'PLANNED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions ALTER COLUMN status SET DEFAULT 'planned'
    `);
    await queryRunner.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check`,
    );
    await queryRunner.query(`
      ALTER TABLE sessions ADD CONSTRAINT sessions_status_check
        CHECK (status IN ('planned', 'in_progress', 'completed', 'closed', 'cancelled'))
    `);
    await queryRunner.query(`
      UPDATE sessions
      SET status = CASE status
        WHEN 'PLANNED'      THEN 'planned'
        WHEN 'IN_PROGRESS'  THEN 'in_progress'
        WHEN 'COMPLETED'    THEN 'completed'
        WHEN 'CLOSED'       THEN 'closed'
        WHEN 'CANCELLED'    THEN 'cancelled'
        ELSE status
      END
    `);
  }
}
