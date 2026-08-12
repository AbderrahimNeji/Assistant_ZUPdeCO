import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstablishmentsPerformanceIndexes1804800000000 implements MigrationInterface {
  name = 'AddEstablishmentsPerformanceIndexes1804800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index covering (company_id, type, created_at DESC) for filtered + sorted list queries.
    // Eliminates the Seq Scan on 66k+ rows when filtering by type (lycee, college, etc.).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_establishments_company_type_created
        ON establishments (company_id, type, created_at DESC)
        WHERE deleted_at IS NULL
    `);

    // Index covering (company_id, created_at DESC) for the default unfiltered list sort.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_establishments_company_created_at
        ON establishments (company_id, created_at DESC)
        WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_establishments_company_type_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_establishments_company_created_at`);
  }
}
