import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Binôme cœur: manual or auto-identified core pairs (student, tutor) per establishment + subject.
 * Used as priority 1 in auto-assignment.
 */
export class BinomeCoeur1730000000019 implements MigrationInterface {
  name = 'BinomeCoeur1730000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE binome_coeur (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        establishment_id UUID NULL REFERENCES establishments (id) ON DELETE CASCADE,
        subject_id UUID NULL REFERENCES subjects (id) ON DELETE SET NULL,
        student_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        tutor_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        source VARCHAR(20) NOT NULL DEFAULT 'manual',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_binome_coeur UNIQUE (company_id, establishment_id, subject_id, student_user_id, tutor_user_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_binome_coeur_company_establishment_subject ON binome_coeur (company_id, establishment_id, subject_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_binome_coeur_company_establishment_subject`);
    await queryRunner.query(`DROP TABLE IF EXISTS binome_coeur`);
  }
}
