import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename table binome_coeur to core_pairs (English) and rename index + unique constraint.
 */
export class RenameBinomeCoeurToCorePairs1730000000022 implements MigrationInterface {
  name = 'RenameBinomeCoeurToCorePairs1730000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE binome_coeur RENAME TO core_pairs`);
    await queryRunner.query(
      `ALTER INDEX idx_binome_coeur_company_establishment_subject RENAME TO idx_core_pairs_company_establishment_subject`,
    );
    await queryRunner.query(
      `ALTER TABLE core_pairs RENAME CONSTRAINT uq_binome_coeur TO uq_core_pairs`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE core_pairs RENAME CONSTRAINT uq_core_pairs TO uq_binome_coeur`,
    );
    await queryRunner.query(
      `ALTER INDEX idx_core_pairs_company_establishment_subject RENAME TO idx_binome_coeur_company_establishment_subject`,
    );
    await queryRunner.query(`ALTER TABLE core_pairs RENAME TO binome_coeur`);
  }
}
