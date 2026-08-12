import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds activity_types and activities tables, extends sessions with activity_id,
 * max_volunteers, subject_id, topic, duration_minutes, recurrence_group_id,
 * extends recurrence_type check, and adds 'tutor' to session_participants role check.
 */
export class ActivityTypesAndSessionFields1730000000010 implements MigrationInterface {
  name = 'ActivityTypesAndSessionFields1730000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE activity_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        order_index INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_activity_types_company_code ON activity_types (company_id, code) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activity_types_company_id ON activity_types (company_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        activity_type_id UUID NOT NULL REFERENCES activity_types (id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        can_has_cr BOOLEAN NOT NULL DEFAULT false,
        bot BOOLEAN NOT NULL DEFAULT false,
        with_link BOOLEAN NOT NULL DEFAULT false,
        chat BOOLEAN NOT NULL DEFAULT false,
        max_tutors INT,
        max_students INT,
        max_volunteers INT,
        order_index INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_activities_company_code ON activities (company_id, code) WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activities_company_id ON activities (company_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_activities_activity_type_id ON activities (activity_type_id)`,
    );

    await queryRunner.query(
      `CREATE TRIGGER tr_activity_types_updated_at BEFORE UPDATE ON activity_types FOR EACH ROW EXECUTE PROCEDURE set_updated_at()`,
    );
    await queryRunner.query(
      `CREATE TRIGGER tr_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE PROCEDURE set_updated_at()`,
    );

    await queryRunner.query(`
      ALTER TABLE sessions
        ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES activities (id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS max_volunteers INT,
        ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects (id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS topic TEXT,
        ADD COLUMN IF NOT EXISTS duration_minutes INT,
        ADD COLUMN IF NOT EXISTS recurrence_group_id UUID
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sessions_activity_id ON sessions (activity_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_sessions_subject_id ON sessions (subject_id)`,
    );

    await queryRunner.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_recurrence_type_check`,
    );
    await queryRunner.query(`
      ALTER TABLE sessions ADD CONSTRAINT sessions_recurrence_type_check
        CHECK (recurrence_type IN (
          'none', 'once', 'daily', 'weekly', 'several_days_per_week',
          'biweekly', 'monthly', 'ab', 'custom'
        ))
    `);

    await queryRunner.query(
      `ALTER TABLE session_participants DROP CONSTRAINT IF EXISTS session_participants_role_check`,
    );
    await queryRunner.query(`
      ALTER TABLE session_participants ADD CONSTRAINT session_participants_role_check
        CHECK (role IN ('tutor', 'volunteer', 'student'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE session_participants DROP CONSTRAINT IF EXISTS session_participants_role_check`,
    );
    await queryRunner.query(`
      ALTER TABLE session_participants ADD CONSTRAINT session_participants_role_check
        CHECK (role IN ('volunteer', 'student'))
    `);

    await queryRunner.query(
      `ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_recurrence_type_check`,
    );
    await queryRunner.query(`
      ALTER TABLE sessions ADD CONSTRAINT sessions_recurrence_type_check
        CHECK (recurrence_type IN ('none', 'weekly', 'biweekly', 'ab', 'monthly'))
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_sessions_subject_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sessions_activity_id`);
    await queryRunner.query(`
      ALTER TABLE sessions
        DROP COLUMN IF EXISTS recurrence_group_id,
        DROP COLUMN IF EXISTS duration_minutes,
        DROP COLUMN IF EXISTS topic,
        DROP COLUMN IF EXISTS subject_id,
        DROP COLUMN IF EXISTS max_volunteers,
        DROP COLUMN IF EXISTS activity_id
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_activities_updated_at ON activities`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_activity_types_updated_at ON activity_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS activities CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS activity_types CASCADE`);
  }
}
