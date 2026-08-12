import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentIdToInterfaceElements1743523300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before adding it
    const columnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'interface_elements' 
      AND column_name = 'parent_id';
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE interface_elements
        ADD COLUMN parent_id UUID NULL REFERENCES interface_elements(id) ON DELETE SET NULL;
      `);

      await queryRunner.query(`
        COMMENT ON COLUMN interface_elements.parent_id IS 'Optional parent element for hierarchical relationships';
      `);
    }

    // Check if index exists before creating it
    const indexExists = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'interface_elements' 
      AND indexname = 'idx_interface_elements_parent_id';
    `);

    if (indexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX idx_interface_elements_parent_id ON interface_elements(parent_id);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_interface_elements_parent_id;
    `);

    await queryRunner.query(`
      ALTER TABLE interface_elements DROP COLUMN IF EXISTS parent_id;
    `);
  }
}
