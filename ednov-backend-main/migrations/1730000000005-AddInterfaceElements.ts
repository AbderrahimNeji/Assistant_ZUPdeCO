import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInterfaceElements1730000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create interface_elements table
    await queryRunner.query(`
      CREATE TABLE interface_elements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        interface_name VARCHAR(100) NOT NULL,
        element_id VARCHAR(100) NOT NULL,
        element_type VARCHAR(50) NOT NULL,
        element_label VARCHAR(255) NOT NULL,
        default_visible BOOLEAN DEFAULT true,
        default_order INT DEFAULT 0,
        default_width VARCHAR(20) DEFAULT 'auto',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_interface_elements_company_interface_element UNIQUE(company_id, interface_name, element_id)
      );

      COMMENT ON TABLE interface_elements IS 'Defines available UI elements for each interface';
      COMMENT ON COLUMN interface_elements.interface_name IS 'Interface identifier (dashboard, sessions, etc.)';
      COMMENT ON COLUMN interface_elements.element_id IS 'Unique element identifier within interface';
      COMMENT ON COLUMN interface_elements.element_type IS 'Type: stat_card, table, chart, widget, etc.';
      COMMENT ON COLUMN interface_elements.default_width IS 'Default width: 1/3, 1/2, 2/3, full, auto';
      COMMENT ON COLUMN interface_elements.config IS 'Element-specific configuration (icons, colors, etc.)';

      CREATE INDEX idx_interface_elements_company_id ON interface_elements(company_id);
      CREATE INDEX idx_interface_elements_interface_name ON interface_elements(interface_name);
      CREATE INDEX idx_interface_elements_element_type ON interface_elements(element_type);
    `);

    // Create role_interface_elements table
    await queryRunner.query(`
      CREATE TABLE role_interface_elements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        element_id UUID NOT NULL REFERENCES interface_elements(id) ON DELETE CASCADE,
        can_view BOOLEAN DEFAULT true,
        can_edit BOOLEAN DEFAULT false,
        can_customize BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_role_interface_elements UNIQUE(role_id, element_id)
      );

      COMMENT ON TABLE role_interface_elements IS 'Defines which elements each role can access';
      COMMENT ON COLUMN role_interface_elements.can_view IS 'User can see this element';
      COMMENT ON COLUMN role_interface_elements.can_edit IS 'User can interact/modify data in element';
      COMMENT ON COLUMN role_interface_elements.can_customize IS 'User can hide/reorder this element';

      CREATE INDEX idx_role_interface_elements_company_id ON role_interface_elements(company_id);
      CREATE INDEX idx_role_interface_elements_role_id ON role_interface_elements(role_id);
      CREATE INDEX idx_role_interface_elements_element_id ON role_interface_elements(element_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS role_interface_elements CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS interface_elements CASCADE`);
  }
}
