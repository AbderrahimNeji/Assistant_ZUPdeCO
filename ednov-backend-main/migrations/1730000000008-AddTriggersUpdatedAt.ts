import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds set_updated_at() triggers to tables created by migrations 3 and 5,
 * so updated_at is maintained consistently with the rest of the schema.
 * Requires set_updated_at() to exist (created by InitialSchema / full-schema.sql).
 */
export class AddTriggersUpdatedAt1730000000008 implements MigrationInterface {
  name = 'AddTriggersUpdatedAt1730000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TRIGGER tr_user_interface_preferences_updated_at
        BEFORE UPDATE ON user_interface_preferences FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_interface_elements_updated_at
        BEFORE UPDATE ON interface_elements FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_role_interface_elements_updated_at
        BEFORE UPDATE ON role_interface_elements FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_user_interface_preferences_updated_at ON user_interface_preferences`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_interface_elements_updated_at ON interface_elements`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_role_interface_elements_updated_at ON role_interface_elements`,
    );
  }
}
