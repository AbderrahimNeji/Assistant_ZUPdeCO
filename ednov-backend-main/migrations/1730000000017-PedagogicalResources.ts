import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds pedagogical_resources table (company-scoped, optional subject/level, for R1/R2).
 */
export class PedagogicalResources1730000000017 implements MigrationInterface {
  name = 'PedagogicalResources1730000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pedagogical_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT,
        content TEXT,
        subject_id UUID REFERENCES subjects (id) ON DELETE SET NULL,
        level_id UUID REFERENCES levels (id) ON DELETE SET NULL,
        type VARCHAR(50),
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_pedagogical_resources_company_id ON pedagogical_resources (company_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pedagogical_resources_deleted_at ON pedagogical_resources (deleted_at)`,
    );
    await queryRunner.query(`
      CREATE TRIGGER tr_pedagogical_resources_updated_at
        BEFORE UPDATE ON pedagogical_resources FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_pedagogical_resources_updated_at ON pedagogical_resources`);
    await queryRunner.query(`DROP TABLE IF EXISTS pedagogical_resources CASCADE`);
  }
}
