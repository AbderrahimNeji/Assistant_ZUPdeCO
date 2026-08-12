import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 1. Backfills role_interface_elements.order from interface_elements.default_order
 *    for every existing row that does not yet have an explicit order.
 * 2. Drops interface_elements.default_order (no longer needed after backfill).
 *
 * These two steps are intentionally in a single migration so that
 * `migration:run` never drops the source column before the data has been copied.
 */
export class DropDefaultOrderFromInterfaceElements1744200000000 implements MigrationInterface {
  name = 'DropDefaultOrderFromInterfaceElements1744200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1 — backfill: copy default_order → rie.order for every row that is still NULL
    await queryRunner.query(`
      UPDATE role_interface_elements rie
      SET "order" = ie.default_order
      FROM interface_elements ie
      WHERE ie.id = rie.element_id
        AND rie."order" IS NULL;
    `);

    // Step 2 — drop the now-redundant source column
    await queryRunner.query(`
      ALTER TABLE interface_elements DROP COLUMN IF EXISTS default_order;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE interface_elements
      ADD COLUMN IF NOT EXISTS default_order INTEGER NOT NULL DEFAULT 0;
    `);
  }
}
