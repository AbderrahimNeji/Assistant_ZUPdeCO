import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds created_by and updated_by to sessions (audit: who created/updated the session).
 * createdAt/updatedAt are already provided by the base entity.
 */
export class SessionCreatedByUpdatedBy1730000000011 implements MigrationInterface {
  name = 'SessionCreatedByUpdatedBy1730000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users (id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users (id) ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions (created_by)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sessions_updated_by ON sessions (updated_by)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sessions_updated_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sessions_created_by`);
    await queryRunner.query(`
      ALTER TABLE sessions
        DROP COLUMN IF EXISTS updated_by,
        DROP COLUMN IF EXISTS created_by
    `);
  }
}
