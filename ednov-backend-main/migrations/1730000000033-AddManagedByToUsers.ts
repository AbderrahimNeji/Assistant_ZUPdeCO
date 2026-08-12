import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional manager reference on users (same company). Used for hierarchy / delegation.
 * Self-management is forbidden via CHECK constraint.
 */
export class AddManagedByToUsers1730000000033 implements MigrationInterface {
  name = 'AddManagedByToUsers1730000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN managed_by UUID NULL REFERENCES users (id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT chk_users_managed_by_not_self
      CHECK (managed_by IS NULL OR managed_by <> id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_users_managed_by ON users (managed_by)
      WHERE deleted_at IS NULL AND managed_by IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_managed_by`);
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_managed_by_not_self`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS managed_by`);
  }
}
