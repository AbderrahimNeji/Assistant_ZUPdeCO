import { MigrationInterface, QueryRunner } from 'typeorm';

const ROLE_GROUP_CHECK = `role_group IN ('super_admin', 'steering', 'operations', 'service_user', 'other')`;

export class AddRoleGroupToRoles1744500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop first so UPDATE is not blocked by an older / stricter CHECK on role_group.
    await queryRunner.query(`ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_role_group;`);

    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'roles'
            AND column_name = 'role_group'
        ) THEN
          ALTER TABLE roles
            ADD COLUMN role_group VARCHAR(32) NOT NULL DEFAULT 'other';
        END IF;
      END
      $migration$;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN roles.role_group IS
        'super_admin (admin), steering (coordinator, manager), operations (volunteer), service_user (tutor), other (student, custom)';
    `);

    await queryRunner.query(`
      UPDATE roles
      SET role_group = CASE LOWER(TRIM(code))
        WHEN 'admin' THEN 'super_admin'
        WHEN 'coordinator' THEN 'steering'
        WHEN 'manager' THEN 'steering'
        WHEN 'volunteer' THEN 'operations'
        WHEN 'tutor' THEN 'service_user'
        WHEN 'student' THEN 'other'
        ELSE CASE
          WHEN LOWER(TRIM(COALESCE(role_group::text, ''))) IN (
            'super_admin', 'steering', 'operations', 'service_user', 'other'
          ) THEN LOWER(TRIM(role_group::text))
          ELSE 'other'
        END
      END;
    `);

    await queryRunner.query(`
      UPDATE roles SET role_group = 'other' WHERE role_group IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE roles ALTER COLUMN role_group SET DEFAULT 'other';
    `);

    await queryRunner.query(`
      ALTER TABLE roles ALTER COLUMN role_group SET NOT NULL;
    `);

    await queryRunner.query(`
      DO $addchk$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_roles_role_group'
        ) THEN
          ALTER TABLE roles
            ADD CONSTRAINT chk_roles_role_group CHECK (${ROLE_GROUP_CHECK});
        END IF;
      END
      $addchk$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_company_role_group ON roles (company_id, role_group)
        WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_roles_company_role_group;`);
    await queryRunner.query(`ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_role_group;`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS role_group;`);
  }
}
