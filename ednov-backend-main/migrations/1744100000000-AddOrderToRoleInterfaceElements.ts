import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderToRoleInterfaceElements1744100000000 implements MigrationInterface {
  name = 'AddOrderToRoleInterfaceElements1744100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE role_interface_elements
      ADD COLUMN IF NOT EXISTS "order" INTEGER NULL;
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN role_interface_elements."order" IS
        'Per-role display order. NULL = element has no defined order (sorted last). Supersedes the former interface_elements.default_order global value.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE role_interface_elements DROP COLUMN IF EXISTS "order";
    `);
  }
}
