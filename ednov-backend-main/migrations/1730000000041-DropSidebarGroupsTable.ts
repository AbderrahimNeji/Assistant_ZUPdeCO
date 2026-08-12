import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Supprime la table sidebar_groups et la colonne group_id sur interface_elements
 * (ancien modèle avec table dédiée). Les chapeaux sidebar utilisent uniquement
 * group_label / group_icon / group_order sur interface_elements.
 */
export class DropSidebarGroupsTable1730000000041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE interface_elements
      DROP CONSTRAINT IF EXISTS fk_interface_elements_group_id;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_interface_elements_group_id;
    `);

    await queryRunner.query(`
      ALTER TABLE interface_elements
      DROP COLUMN IF EXISTS group_id;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS sidebar_groups CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sidebar_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        icon_name VARCHAR(50),
        display_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_sidebar_groups_company_code UNIQUE(company_id, code)
      );

      CREATE INDEX IF NOT EXISTS idx_sidebar_groups_company_id ON sidebar_groups(company_id);

      ALTER TABLE interface_elements
      ADD COLUMN IF NOT EXISTS group_id UUID;

      ALTER TABLE interface_elements
      DROP CONSTRAINT IF EXISTS fk_interface_elements_group_id;

      ALTER TABLE interface_elements
      ADD CONSTRAINT fk_interface_elements_group_id
        FOREIGN KEY (group_id) REFERENCES sidebar_groups(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_interface_elements_group_id ON interface_elements(group_id);
    `);
  }
}
