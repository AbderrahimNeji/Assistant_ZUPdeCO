import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds gamification tables: gamification_niveaux, gamification_badges,
 * gamification_badge_conditions, gamification_xp_regles, tutor_gamification,
 * gamification_xp_logs, gamification_user_badges, gamification_challenges,
 * gamification_challenge_progress.
 */
export class GamificationTables1730000000013 implements MigrationInterface {
  name = 'GamificationTables1730000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE gamification_niveaux (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        numero INT NOT NULL,
        nom TEXT NOT NULL,
        xp_requis INT NOT NULL,
        icone TEXT,
        couleur TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_gamification_niveaux_company_numero UNIQUE (company_id, numero)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_gamification_niveaux_company_id ON gamification_niveaux (company_id)`,
    );
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_niveaux_updated_at
        BEFORE UPDATE ON gamification_niveaux FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE gamification_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        code VARCHAR(100) NOT NULL,
        nom TEXT NOT NULL,
        description TEXT,
        categorie VARCHAR(100),
        icone TEXT,
        couleur TEXT,
        xp_recompense INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_gamification_badges_company_code UNIQUE (company_id, code)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_gamification_badges_company_id ON gamification_badges (company_id)`,
    );
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_badges_updated_at
        BEFORE UPDATE ON gamification_badges FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE gamification_badge_conditions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        badge_id UUID NOT NULL REFERENCES gamification_badges (id) ON DELETE CASCADE,
        type_condition VARCHAR(100) NOT NULL,
        operateur VARCHAR(10) NOT NULL,
        valeur INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_gamification_badge_conditions_badge_id ON gamification_badge_conditions (badge_id)`,
    );
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_badge_conditions_updated_at
        BEFORE UPDATE ON gamification_badge_conditions FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE gamification_xp_regles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        xp_value INT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_gamification_xp_regles_company_action UNIQUE (company_id, action)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_gamification_xp_regles_company_id ON gamification_xp_regles (company_id)`,
    );
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_xp_regles_updated_at
        BEFORE UPDATE ON gamification_xp_regles FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE tutor_gamification (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        total_xp INT NOT NULL DEFAULT 0,
        current_niveau_id UUID REFERENCES gamification_niveaux (id) ON DELETE SET NULL,
        attendance_score DECIMAL(5,2),
        pedagogical_quality_score DECIMAL(5,2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_tutor_gamification_user_id UNIQUE (user_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_tutor_gamification_company_id ON tutor_gamification (company_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_tutor_gamification_company_total_xp ON tutor_gamification (company_id, total_xp DESC)`,
    );
    await queryRunner.query(`
      CREATE TRIGGER tr_tutor_gamification_updated_at
        BEFORE UPDATE ON tutor_gamification FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE gamification_xp_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        amount INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        source_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_gamification_xp_logs_user_id ON gamification_xp_logs (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_gamification_xp_logs_company_id ON gamification_xp_logs (company_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_gamification_xp_logs_created_at ON gamification_xp_logs (created_at)`,
    );

    await queryRunner.query(`
      CREATE TABLE gamification_user_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        badge_id UUID NOT NULL REFERENCES gamification_badges (id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_gamification_user_badges_user_badge UNIQUE (user_id, badge_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_gamification_user_badges_user_id ON gamification_user_badges (user_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE gamification_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        code VARCHAR(100) NOT NULL,
        label TEXT NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'one_shot',
        target_value INT NOT NULL,
        unit VARCHAR(50),
        start_at TIMESTAMPTZ,
        end_at TIMESTAMPTZ,
        xp_reward INT NOT NULL DEFAULT 0,
        badge_id UUID REFERENCES gamification_badges (id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_gamification_challenges_company_id ON gamification_challenges (company_id)`,
    );
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_challenges_updated_at
        BEFORE UPDATE ON gamification_challenges FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE gamification_challenge_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        challenge_id UUID NOT NULL REFERENCES gamification_challenges (id) ON DELETE CASCADE,
        current_value INT NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_gamification_challenge_progress_user_challenge UNIQUE (user_id, challenge_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_gamification_challenge_progress_user_id ON gamification_challenge_progress (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_gamification_challenge_progress_challenge_id ON gamification_challenge_progress (challenge_id)`,
    );
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_challenge_progress_updated_at
        BEFORE UPDATE ON gamification_challenge_progress FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_gamification_challenge_progress_updated_at ON gamification_challenge_progress`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS gamification_challenge_progress`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_gamification_challenges_updated_at ON gamification_challenges`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS gamification_challenges`);
    await queryRunner.query(`DROP TABLE IF EXISTS gamification_user_badges`);
    await queryRunner.query(`DROP TABLE IF EXISTS gamification_xp_logs`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_tutor_gamification_updated_at ON tutor_gamification`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS tutor_gamification`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_gamification_xp_regles_updated_at ON gamification_xp_regles`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS gamification_xp_regles`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_gamification_badge_conditions_updated_at ON gamification_badge_conditions`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS gamification_badge_conditions`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_gamification_badges_updated_at ON gamification_badges`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS gamification_badges`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS tr_gamification_niveaux_updated_at ON gamification_niveaux`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS gamification_niveaux`);
  }
}
