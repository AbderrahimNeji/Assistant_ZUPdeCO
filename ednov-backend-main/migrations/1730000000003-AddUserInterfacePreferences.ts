import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserInterfacePreferences1730000000003 implements MigrationInterface {
  name = 'AddUserInterfacePreferences1730000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_interface_preferences table
    await queryRunner.query(`
      CREATE TABLE user_interface_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_dark_mode BOOLEAN DEFAULT false,
        interface_configs JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_user_interface_preferences_user_id UNIQUE(user_id)
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_uip_user_id ON user_interface_preferences(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_uip_company_id ON user_interface_preferences(company_id)
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE user_interface_preferences IS 'Stores user interface customization preferences including dark mode and interface-specific configurations'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN user_interface_preferences.interface_configs IS 'JSONB object storing per-interface configurations (dashboard cards, filters, layouts, etc.)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_interface_preferences CASCADE`);
  }
}
