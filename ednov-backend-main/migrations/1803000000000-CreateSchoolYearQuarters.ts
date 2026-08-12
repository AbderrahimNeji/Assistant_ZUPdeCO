import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchoolYearQuarters1803000000000 implements MigrationInterface {
  name = 'CreateSchoolYearQuarters1803000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create school_year_quarters table
    await queryRunner.query(`
      CREATE TABLE school_year_quarters (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_year_id    UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
        company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        number            INT NOT NULL CHECK (number >= 1 AND number <= 3),
        start_date        DATE NOT NULL,
        end_date          DATE NOT NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_dates CHECK (end_date >= start_date)
      );
    `);

    // Index on school_year_id for fast lookups
    await queryRunner.query(`
      CREATE INDEX idx_school_year_quarters_school_year 
      ON school_year_quarters(school_year_id);
    `);

    // Index on company_id
    await queryRunner.query(`
      CREATE INDEX idx_school_year_quarters_company 
      ON school_year_quarters(company_id);
    `);

    // Composite index for querying by school_year and quarter number
    await queryRunner.query(`
      CREATE INDEX idx_school_year_quarters_year_number 
      ON school_year_quarters(school_year_id, number);
    `);

    // Unique constraint: one quarter number per school year
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_school_year_quarters_unique 
      ON school_year_quarters(school_year_id, number);
    `);

    // Trigger for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_school_year_quarters_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_school_year_quarters_updated_at
      BEFORE UPDATE ON school_year_quarters
      FOR EACH ROW
      EXECUTE FUNCTION update_school_year_quarters_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_school_year_quarters_updated_at ON school_year_quarters;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_school_year_quarters_updated_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_year_quarters_unique;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_year_quarters_year_number;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_year_quarters_company;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_year_quarters_school_year;`);
    await queryRunner.query(`DROP TABLE IF EXISTS school_year_quarters;`);
  }
}
