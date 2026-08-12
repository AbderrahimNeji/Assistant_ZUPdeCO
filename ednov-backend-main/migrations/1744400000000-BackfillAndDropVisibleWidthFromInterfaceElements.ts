import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1. Backfills role_interface_elements.visible and role_interface_elements.width
 *    from interface_elements.default_visible and interface_elements.default_width
 *    for every existing row.
 * 2. Drops interface_elements.default_visible and interface_elements.default_width
 *    (no longer needed after backfill).
 *
 * These steps are intentionally in a single migration so that
 * `migration:run` never drops the source columns before the data has been copied.
 */
export class BackfillAndDropVisibleWidthFromInterfaceElements1744400000000 implements MigrationInterface {
  name = 'BackfillAndDropVisibleWidthFromInterfaceElements1744400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1 — backfill: copy default_visible and default_width → rie.visible / rie.width
    await queryRunner.query(`
      UPDATE role_interface_elements rie
      SET "visible" = ie.default_visible,
          "width"   = ie.default_width
      FROM interface_elements ie
      WHERE ie.id = rie.element_id;
    `);

    // Step 2 — drop the now-redundant source columns
    await queryRunner.query(`
      ALTER TABLE interface_elements DROP COLUMN IF EXISTS default_visible;
    `);
    await queryRunner.query(`
      ALTER TABLE interface_elements DROP COLUMN IF EXISTS default_width;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE interface_elements
      ADD COLUMN IF NOT EXISTS default_visible BOOLEAN DEFAULT true;
    `);
    await queryRunner.query(`
      ALTER TABLE interface_elements
      ADD COLUMN IF NOT EXISTS default_width VARCHAR(20) DEFAULT 'auto';
    `);
    // Restore from first matching RIE row per element (best-effort reverse)
    await queryRunner.query(`
      UPDATE interface_elements ie
      SET default_visible = sub.visible,
          default_width   = sub.width
      FROM (
        SELECT DISTINCT ON (element_id) element_id, "visible", "width"
        FROM role_interface_elements
        ORDER BY element_id, id
      ) sub
      WHERE sub.element_id = ie.id;
    `);
  }
}
