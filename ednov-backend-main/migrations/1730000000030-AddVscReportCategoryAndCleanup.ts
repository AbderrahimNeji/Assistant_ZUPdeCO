import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration pour les rapports VSC automatiques :
 * - Suppression des champs obsolètes (session_summary, student_progress, students, participants)
 * - Ajout des champs pour rapports automatiques (category, period, metrics, vsc_id, establishment_id)
 * - Ajout des contraintes d'unicité et index pour performance
 */
export class AddVscReportCategoryAndCleanup1730000000030 implements MigrationInterface {
  name = 'AddVscReportCategoryAndCleanup1730000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Suppression des anciens champs obsolètes
    await queryRunner.query(`
      ALTER TABLE vsc_reports
        DROP COLUMN IF EXISTS session_summary,
        DROP COLUMN IF EXISTS student_progress,
        DROP COLUMN IF EXISTS students,
        DROP COLUMN IF EXISTS participants
    `);

    // Ajout des nouveaux champs pour rapports automatiques
    await queryRunner.query(`
      ALTER TABLE vsc_reports
        ADD COLUMN category VARCHAR(20) CHECK (category IN ('daily', 'weekly')),
        ADD COLUMN period_start TIMESTAMPTZ,
        ADD COLUMN period_end TIMESTAMPTZ,
        ADD COLUMN vsc_id UUID REFERENCES users(id) ON DELETE CASCADE,
        ADD COLUMN establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE
    `);

    // Ajout des champs métriques
    await queryRunner.query(`
      ALTER TABLE vsc_reports
        ADD COLUMN sessions_completed INTEGER DEFAULT 0,
        ADD COLUMN sessions_closed INTEGER DEFAULT 0,
        ADD COLUMN sessions_cancelled INTEGER DEFAULT 0,
        ADD COLUMN assignments_created INTEGER DEFAULT 0,
        ADD COLUMN reports_submitted INTEGER DEFAULT 0,
        ADD COLUMN reports_pending INTEGER DEFAULT 0,
        ADD COLUMN reports_validated INTEGER DEFAULT 0,
        ADD COLUMN tutor_hours DECIMAL(10,2) DEFAULT 0
    `);

    // Contrainte d'unicité pour éviter les doublons de rapports automatiques
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_vsc_reports_unique 
      ON vsc_reports(vsc_id, establishment_id, category, period_start)
      WHERE vsc_id IS NOT NULL AND establishment_id IS NOT NULL AND category IS NOT NULL AND period_start IS NOT NULL
    `);

    // Index pour les requêtes de rapports automatiques
    await queryRunner.query(`
      CREATE INDEX idx_vsc_reports_vsc_id ON vsc_reports(vsc_id) WHERE vsc_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vsc_reports_establishment_id ON vsc_reports(establishment_id) WHERE establishment_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vsc_reports_category ON vsc_reports(category) WHERE category IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_vsc_reports_period ON vsc_reports(period_start, period_end) 
      WHERE period_start IS NOT NULL AND period_end IS NOT NULL
    `);

    // Commentaires pour documentation
    await queryRunner.query(`
      COMMENT ON COLUMN vsc_reports.category IS 'Type de rapport automatique : daily (journalier) ou weekly (hebdomadaire)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN vsc_reports.period_start IS 'Début de la période couverte par le rapport automatique'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN vsc_reports.period_end IS 'Fin de la période couverte par le rapport automatique'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN vsc_reports.vsc_id IS 'VSC concerné par le rapport automatique (NULL pour rapports manuels)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN vsc_reports.establishment_id IS 'Établissement concerné par le rapport automatique (NULL pour rapports manuels)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Suppression des index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vsc_reports_period`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vsc_reports_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vsc_reports_establishment_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vsc_reports_vsc_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_vsc_reports_unique`);

    // Suppression des champs métriques
    await queryRunner.query(`
      ALTER TABLE vsc_reports
        DROP COLUMN IF EXISTS tutor_hours,
        DROP COLUMN IF EXISTS reports_validated,
        DROP COLUMN IF EXISTS reports_pending,
        DROP COLUMN IF EXISTS reports_submitted,
        DROP COLUMN IF EXISTS assignments_created,
        DROP COLUMN IF EXISTS sessions_cancelled,
        DROP COLUMN IF EXISTS sessions_closed,
        DROP COLUMN IF EXISTS sessions_completed
    `);

    // Suppression des nouveaux champs
    await queryRunner.query(`
      ALTER TABLE vsc_reports
        DROP COLUMN IF EXISTS establishment_id,
        DROP COLUMN IF EXISTS vsc_id,
        DROP COLUMN IF EXISTS period_end,
        DROP COLUMN IF EXISTS period_start,
        DROP COLUMN IF EXISTS category
    `);

    // Restauration des anciens champs (sans données)
    await queryRunner.query(`
      ALTER TABLE vsc_reports
        ADD COLUMN session_summary TEXT,
        ADD COLUMN student_progress TEXT,
        ADD COLUMN students JSONB,
        ADD COLUMN participants JSONB
    `);
  }
}
