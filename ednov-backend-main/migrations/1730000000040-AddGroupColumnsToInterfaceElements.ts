import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupColumnsToInterfaceElements1730000000040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE interface_elements
      ADD COLUMN group_label VARCHAR(255),
      ADD COLUMN group_icon VARCHAR(50),
      ADD COLUMN group_order INT DEFAULT 0;

      COMMENT ON COLUMN interface_elements.group_label IS 'Optional group label for grouping sidebar menus (e.g., "Gestion des Personnes")';
      COMMENT ON COLUMN interface_elements.group_icon IS 'Optional icon name for the group header';
      COMMENT ON COLUMN interface_elements.group_order IS 'Display order of the group (items with same group_label share this order)';

      CREATE INDEX idx_interface_elements_group_label ON interface_elements(group_label) WHERE group_label IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE interface_elements
      DROP COLUMN IF EXISTS group_label,
      DROP COLUMN IF EXISTS group_icon,
      DROP COLUMN IF EXISTS group_order;
    `);
  }
}
