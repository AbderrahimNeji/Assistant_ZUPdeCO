import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisibleWidthToRoleInterfaceElements1744300000000 implements MigrationInterface {
  name = 'AddVisibleWidthToRoleInterfaceElements1744300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE role_interface_elements
      ADD COLUMN IF NOT EXISTS "visible" BOOLEAN NULL;
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN role_interface_elements."visible" IS
        'Per-role default visibility. NULL = fallback to true. Supersedes the former interface_elements.default_visible global value.';
    `);
    await queryRunner.query(`
      ALTER TABLE role_interface_elements
      ADD COLUMN IF NOT EXISTS "width" VARCHAR(20) NULL;
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN role_interface_elements."width" IS
        'Per-role default width (1/3, 1/2, 2/3, full, auto). NULL = fallback to auto. Supersedes the former interface_elements.default_width global value.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE role_interface_elements DROP COLUMN IF EXISTS "visible";
    `);
    await queryRunner.query(`
      ALTER TABLE role_interface_elements DROP COLUMN IF EXISTS "width";
    `);
  }
}
