import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds indexes on deleted_at for soft-delete tables (companies already has one).
 * Improves queries that filter by deleted_at IS NULL.
 */
const TABLES_WITH_DELETED_AT = [
  'establishments',
  'rooms',
  'users',
  'roles',
  'profiles',
  'programs',
  'levels',
  'subjects',
  'holidays',
  'sessions',
  'themes',
  'media_assets',
  'email_templates',
  'document_templates',
  'interface_elements',
];

export class AddDeletedAtIndexes1730000000009 implements MigrationInterface {
  name = 'AddDeletedAtIndexes1730000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES_WITH_DELETED_AT) {
      const indexName = `idx_${table}_deleted_at`;
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (deleted_at)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES_WITH_DELETED_AT) {
      const indexName = `idx_${table}_deleted_at`;
      await queryRunner.query(`DROP INDEX IF EXISTS ${indexName}`);
    }
  }
}
