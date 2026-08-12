import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refines interface_elements.element_type by splitting the broad 'custom' type
 * into two precise types:
 *
 *   - 'tab'    → navigation/filter tabs (element_id LIKE 'tab-%' or '%-tab')
 *   - 'filter' → all other 'custom' elements (filter panels, toggles, dropdowns)
 *
 * The 'custom' value is kept in the allowed set for forward-compatibility
 * but is no longer used for existing rows after this migration.
 */
export class RefineInterfaceElementTypes1744500000000 implements MigrationInterface {
  name = 'RefineInterfaceElementTypes1744500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1 — tab elements: prefix 'tab-' or suffix '-tab'
    await queryRunner.query(`
      UPDATE interface_elements
      SET element_type = 'tab'
      WHERE element_type = 'custom'
        AND (element_id LIKE 'tab-%' OR element_id LIKE '%-tab');
    `);

    // Step 2 — everything else that was 'custom' → 'filter'
    await queryRunner.query(`
      UPDATE interface_elements
      SET element_type = 'filter'
      WHERE element_type = 'custom';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE interface_elements
      SET element_type = 'custom'
      WHERE element_type IN ('tab', 'filter');
    `);
  }
}
