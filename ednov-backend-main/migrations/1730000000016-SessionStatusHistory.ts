import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Session status history: one row per stored status transition (manual, attendance, cr_validation).
 * Time-based transitions are computed at GET, not stored.
 */
export class SessionStatusHistory1730000000016 implements MigrationInterface {
  name = 'SessionStatusHistory1730000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE session_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
        from_status VARCHAR(20) NOT NULL,
        to_status VARCHAR(20) NOT NULL,
        trigger_type VARCHAR(30) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        actor_id UUID NULL REFERENCES users (id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_session_status_history_session_id ON session_status_history (session_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_session_status_history_session_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS session_status_history`);
  }
}
