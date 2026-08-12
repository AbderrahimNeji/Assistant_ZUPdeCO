import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds entity_sub_key, entity_filter, and mode columns to interface_elements.
 * Supports sub-categorization of entities (e.g., session types) and mode filtering (présentiel/distanciel).
 * All columns are nullable to avoid regressions.
 */
export class AddColumnsToInterfaceElements1802200000000 implements MigrationInterface {
  name = 'AddColumnsToInterfaceElements1802200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE interface_elements ADD COLUMN IF NOT EXISTS entity_sub_key VARCHAR(100) NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN interface_elements.entity_sub_key IS
        'Sub-category field for filtering (e.g., session.activity_type_id for session sub-types)';
    `);

    await queryRunner.query(`
      ALTER TABLE interface_elements ADD COLUMN IF NOT EXISTS entity_filter JSONB NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN interface_elements.entity_filter IS
        'Additional filtering conditions (e.g., {activity_type_id: [uuid1, uuid2]})';
    `);

    await queryRunner.query(`
      ALTER TABLE interface_elements ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NULL;
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN interface_elements.mode IS
        'Mode restriction: in_person, remote, hybrid, or null (visible in all modes)';
    `);

    await queryRunner.query(`
      ALTER TABLE interface_elements ADD CONSTRAINT chk_ie_mode
        CHECK (mode IS NULL OR mode IN ('in_person', 'remote', 'hybrid'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE interface_elements DROP CONSTRAINT IF EXISTS chk_ie_mode;`);
    await queryRunner.query(`ALTER TABLE interface_elements DROP COLUMN IF EXISTS mode;`);
    await queryRunner.query(`ALTER TABLE interface_elements DROP COLUMN IF EXISTS entity_filter;`);
    await queryRunner.query(`ALTER TABLE interface_elements DROP COLUMN IF EXISTS entity_sub_key;`);
  }
}
