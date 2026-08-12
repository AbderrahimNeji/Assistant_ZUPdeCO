import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Inserts default XP rules for each existing company so that triggers
 * (seance_terminee, cr_soumis) grant XP without admin having to create rules first.
 */
export class GamificationDefaultXpRules1730000000015 implements MigrationInterface {
  name = 'GamificationDefaultXpRules1730000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO gamification_xp_regles (id, company_id, action, xp_value, description, is_active, sort_order, created_at, updated_at)
      SELECT gen_random_uuid(), c.id, 'seance_terminee', 10, 'Séance terminée (tuteur présent)', true, 0, now(), now()
      FROM companies c
      WHERE c.deleted_at IS NULL
      ON CONFLICT (company_id, action) DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO gamification_xp_regles (id, company_id, action, xp_value, description, is_active, sort_order, created_at, updated_at)
      SELECT gen_random_uuid(), c.id, 'cr_soumis', 5, 'Compte rendu soumis ou validé', true, 1, now(), now()
      FROM companies c
      WHERE c.deleted_at IS NULL
      ON CONFLICT (company_id, action) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM gamification_xp_regles WHERE action IN ('seance_terminee', 'cr_soumis')
    `);
  }
}
