import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleLabelToUserRoles1730000000028 implements MigrationInterface {
  name = 'AddRoleLabelToUserRoles1730000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_roles
      ADD COLUMN IF NOT EXISTS role_label VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_roles
      DROP COLUMN IF EXISTS role_label
    `);
  }
}
