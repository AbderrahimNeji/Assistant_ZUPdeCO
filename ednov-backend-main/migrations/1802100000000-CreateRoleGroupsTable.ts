import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the role_groups table for managing role families/groups.
 * Each company can have custom role groups. A set of system defaults is seeded separately.
 * Note: roles.role_group remains a varchar referencing role_groups.code (no FK yet for backward compatibility).
 */
export class CreateRoleGroupsTable1802100000000 implements MigrationInterface {
  name = 'CreateRoleGroupsTable1802100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        icon VARCHAR(100) NULL,
        color VARCHAR(50) NULL,
        mode VARCHAR(20) NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT chk_role_groups_mode CHECK (mode IS NULL OR mode IN ('in_person', 'remote', 'hybrid'))
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_role_groups_company_code
        ON role_groups (company_id, code) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_role_groups_company_sort
        ON role_groups (company_id, sort_order) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      COMMENT ON TABLE role_groups IS
        'Represents a family/group of roles (e.g. admins, tutors, students). Replaces hardcoded roleGroup strings.';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN role_groups.code IS
        'Stable machine-readable code (e.g. admins, tutors, students)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN role_groups.sort_order IS
        'Display order in UI (lower = first)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS role_groups;`);
  }
}
