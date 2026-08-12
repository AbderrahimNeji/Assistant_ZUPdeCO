import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds hierarchy_level, icon, color, and mode columns to the roles table.
 * All columns are nullable to avoid regressions on existing roles.
 */
export class AddColumnsToRoles1802000000000 implements MigrationInterface {
  name = 'AddColumnsToRoles1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN roles.hierarchy_level IS
        'Hierarchical position within the role group (1 = highest authority). Multiple roles can share the same level.';
    `);

    await queryRunner.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS icon VARCHAR(100) NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN roles.icon IS
        'Lucide icon name for UI display (e.g. Shield, Users, GraduationCap)';
    `);

    await queryRunner.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS color VARCHAR(50) NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN roles.color IS
        'CSS color value or branding palette token for UI display';
    `);

    await queryRunner.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN roles.mode IS
        'Operation mode flag: in_person, remote, hybrid, or null (applicable in all modes)';
    `);

    await queryRunner.query(`
      ALTER TABLE roles ADD CONSTRAINT chk_roles_mode
        CHECK (mode IS NULL OR mode IN ('in_person', 'remote', 'hybrid'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_mode;`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS mode;`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS color;`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS icon;`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS hierarchy_level;`);
  }
}
