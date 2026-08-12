import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManagedByToEstablishments1730000000044 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE establishments
      ADD COLUMN managed_by_id UUID NULL REFERENCES users (id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_establishments_managed_by_id
      ON establishments (managed_by_id)
      WHERE deleted_at IS NULL AND managed_by_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_establishments_managed_by_id`);
    await queryRunner.query(`ALTER TABLE establishments DROP COLUMN IF EXISTS managed_by_id`);
  }
}
