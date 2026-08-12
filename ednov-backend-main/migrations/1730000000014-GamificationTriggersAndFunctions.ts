import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds PostgreSQL functions and triggers for gamification:
 * - gamification_add_xp: add XP to a tutor, log it, evaluate badges, update level
 * - gamification_evaluate_badges: check badge conditions and award badges
 * - gamification_update_niveau: set current_niveau_id from total_xp
 * - Trigger on sessions (status -> COMPLETED): grant XP to tutors present (seance_terminee)
 * - Trigger on session_reports (status -> submitted/validated): grant XP to author (cr_soumis)
 */
export class GamificationTriggersAndFunctions1730000000014 implements MigrationInterface {
  name = 'GamificationTriggersAndFunctions1730000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION gamification_update_niveau(p_user_id UUID, p_company_id UUID)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_total_xp INT;
        v_niveau_id UUID;
      BEGIN
        SELECT total_xp INTO v_total_xp
        FROM tutor_gamification
        WHERE user_id = p_user_id AND company_id = p_company_id;
        IF v_total_xp IS NULL THEN
          RETURN;
        END IF;
        SELECT id INTO v_niveau_id
        FROM gamification_niveaux
        WHERE company_id = p_company_id AND is_active = true AND xp_requis <= v_total_xp
        ORDER BY xp_requis DESC
        LIMIT 1;
        UPDATE tutor_gamification
        SET current_niveau_id = v_niveau_id, updated_at = now()
        WHERE user_id = p_user_id AND company_id = p_company_id;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION gamification_evaluate_badges(p_user_id UUID, p_company_id UUID)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        r RECORD;
        v_seances_count INT;
        v_cr_count INT;
        v_cond_ok BOOLEAN;
        v_val INT;
      BEGIN
        SELECT COUNT(*) INTO v_seances_count
        FROM gamification_xp_logs
        WHERE user_id = p_user_id AND company_id = p_company_id AND action = 'seance_terminee';
        SELECT COUNT(*) INTO v_cr_count
        FROM gamification_xp_logs
        WHERE user_id = p_user_id AND company_id = p_company_id AND action = 'cr_soumis';
        FOR r IN
          SELECT b.id AS badge_id, b.xp_recompense
          FROM gamification_badges b
          WHERE b.company_id = p_company_id AND b.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM gamification_user_badges ub
            WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
          )
          AND EXISTS (
            SELECT 1 FROM gamification_badge_conditions c
            WHERE c.badge_id = b.id
            AND (
              (c.type_condition = 'seances_count' AND CASE c.operateur
                WHEN '>=' THEN v_seances_count >= c.valeur
                WHEN '>' THEN v_seances_count > c.valeur
                WHEN '=' THEN v_seances_count = c.valeur
                WHEN '<' THEN v_seances_count < c.valeur
                WHEN '<=' THEN v_seances_count <= c.valeur
                ELSE false END)
              OR
              (c.type_condition = 'cr_soumis_count' AND CASE c.operateur
                WHEN '>=' THEN v_cr_count >= c.valeur
                WHEN '>' THEN v_cr_count > c.valeur
                WHEN '=' THEN v_cr_count = c.valeur
                WHEN '<' THEN v_cr_count < c.valeur
                WHEN '<=' THEN v_cr_count <= c.valeur
                ELSE false END)
            )
          )
        LOOP
          INSERT INTO gamification_user_badges (id, user_id, badge_id, created_at)
          VALUES (gen_random_uuid(), p_user_id, r.badge_id, now())
          ON CONFLICT (user_id, badge_id) DO NOTHING;
          IF r.xp_recompense > 0 THEN
            UPDATE tutor_gamification
            SET total_xp = total_xp + r.xp_recompense, updated_at = now()
            WHERE user_id = p_user_id AND company_id = p_company_id;
            INSERT INTO gamification_xp_logs (id, user_id, company_id, amount, action, source_id, created_at)
            VALUES (gen_random_uuid(), p_user_id, p_company_id, r.xp_recompense, 'badge_recompense', r.badge_id, now());
          END IF;
        END LOOP;
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION gamification_add_xp(
        p_user_id UUID,
        p_company_id UUID,
        p_action VARCHAR(100),
        p_source_id UUID DEFAULT NULL
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_xp INT;
      BEGIN
        SELECT xp_value INTO v_xp
        FROM gamification_xp_regles
        WHERE company_id = p_company_id AND action = p_action AND is_active = true;
        IF v_xp IS NULL OR v_xp <= 0 THEN
          RETURN;
        END IF;
        INSERT INTO tutor_gamification (id, user_id, company_id, total_xp, created_at, updated_at)
        VALUES (gen_random_uuid(), p_user_id, p_company_id, v_xp, now(), now())
        ON CONFLICT (user_id) DO UPDATE SET
          total_xp = tutor_gamification.total_xp + v_xp,
          updated_at = now();
        INSERT INTO gamification_xp_logs (id, user_id, company_id, amount, action, source_id, created_at)
        VALUES (gen_random_uuid(), p_user_id, p_company_id, v_xp, p_action, p_source_id, now());
        PERFORM gamification_evaluate_badges(p_user_id, p_company_id);
        PERFORM gamification_update_niveau(p_user_id, p_company_id);
      END;
      $$;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION tr_gamification_on_session_completed()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'COMPLETED') THEN
          PERFORM gamification_add_xp(sp.user_id, NEW.company_id, 'seance_terminee', NEW.id)
          FROM session_participants sp
          WHERE sp.session_id = NEW.id
            AND sp.role = 'tutor'
            AND sp.attendance_status = 'present';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_session_completed
        AFTER UPDATE ON sessions
        FOR EACH ROW
        EXECUTE PROCEDURE tr_gamification_on_session_completed()
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION tr_gamification_on_report_submitted()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        IF NEW.status IN ('submitted', 'validated') AND (OLD.status IS NULL OR OLD.status NOT IN ('submitted', 'validated')) THEN
          PERFORM gamification_add_xp(NEW.author_id, NEW.company_id, 'cr_soumis', NEW.session_id);
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_report_submitted
        AFTER UPDATE ON session_reports
        FOR EACH ROW
        EXECUTE PROCEDURE tr_gamification_on_report_submitted()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_gamification_report_submitted ON session_reports`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS tr_gamification_on_report_submitted()`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_gamification_session_completed ON sessions`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS tr_gamification_on_session_completed()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS gamification_add_xp(UUID, UUID, VARCHAR, UUID)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS gamification_add_xp(UUID, UUID, VARCHAR)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS gamification_evaluate_badges(UUID, UUID)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS gamification_update_niveau(UUID, UUID)`);
  }
}
