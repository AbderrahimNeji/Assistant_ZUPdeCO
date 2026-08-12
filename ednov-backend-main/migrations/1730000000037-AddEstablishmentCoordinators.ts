import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create establishment_coordinators junction table for many-to-many relationship
 * between establishments and coordinators (users with COORDINATOR role).
 */
export class AddEstablishmentCoordinators1730000000037 implements MigrationInterface {
  name = 'AddEstablishmentCoordinators1730000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE establishment_coordinators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        establishment_id UUID NOT NULL REFERENCES establishments (id) ON DELETE CASCADE,
        coordinator_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_establishment_coordinator UNIQUE (establishment_id, coordinator_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_establishment_coordinators_establishment_id ON establishment_coordinators (establishment_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_establishment_coordinators_coordinator_id ON establishment_coordinators (coordinator_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_establishment_coordinators_company_id ON establishment_coordinators (company_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_establishment_coordinators_company_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_establishment_coordinators_coordinator_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_establishment_coordinators_establishment_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS establishment_coordinators`);
  }
}
