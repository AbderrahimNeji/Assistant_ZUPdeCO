import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds session_format (in_person | remote | hybrid) and join_link to sessions.
 */
export class SessionFormatAndJoinLink1730000000016 implements MigrationInterface {
  name = 'SessionFormatAndJoinLink1730000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions
        ADD COLUMN IF NOT EXISTS session_format varchar(20) NOT NULL DEFAULT 'in_person',
        ADD COLUMN IF NOT EXISTS join_link text
    `);
    await queryRunner.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_session_format_check`,
    );
    await queryRunner.query(`
      ALTER TABLE sessions
        ADD CONSTRAINT sessions_session_format_check
        CHECK (session_format IN ('in_person', 'remote', 'hybrid'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_session_format_check`,
    );
    await queryRunner.query(`
      ALTER TABLE sessions
        DROP COLUMN IF EXISTS join_link,
        DROP COLUMN IF EXISTS session_format
    `);
  }
}
