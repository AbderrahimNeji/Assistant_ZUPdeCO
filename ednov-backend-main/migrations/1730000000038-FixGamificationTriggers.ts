import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fixes gamification trigger and function bugs:
 *
 * Bug 1 (critique): tr_gamification_on_session_completed écoutait status='COMPLETED',
 *   mais ce statut n'est jamais persisté en base. L'app passe IN_PROGRESS→CLOSED via
 *   validation du CR. 'COMPLETED' est uniquement un statut calculé à la lecture.
 *   Fix: écouter 'CLOSED' au lieu de 'COMPLETED'.
 *
 * Bug 2: gamification_update_niveau et gamification_evaluate_badges filtraient sur
 *   WHERE user_id=... AND company_id=..., alors que tutor_gamification a une contrainte
 *   UNIQUE(user_id) seulement. Si la ligne est créée avec company_id=A puis XP ajouté
 *   depuis company_id=B, le UPDATE ne trouve pas la ligne → niveau jamais mis à jour.
 *   Fix: filtrer sur user_id uniquement pour les UPDATE de tutor_gamification.
 *
 * Bug 3 (mineur): le trigger CR n'était que AFTER UPDATE. Si un rapport est
 *   créé directement en statut 'submitted', l'XP n'était pas attribué.
 *   Fix: ajouter un trigger AFTER INSERT.
 */
export class FixGamificationTriggers1730000000038 implements MigrationInterface {
  name = 'FixGamificationTriggers1730000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Fix Bug 2: gamification_update_niveau ---
    // Le UPDATE sur tutor_gamification utilisait (user_id AND company_id) alors que
    // la contrainte unique est UNIQUE(user_id). On filtre désormais sur user_id seul,
    // mais on continue à chercher le niveau par company_id (config par société).
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
        WHERE user_id = p_user_id;
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
        WHERE user_id = p_user_id;
      END;
      $$;
    `);

    // --- Fix Bug 2: gamification_evaluate_badges ---
    // Même correction: UPDATE tutor_gamification filtré sur user_id uniquement.
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
            WHERE user_id = p_user_id;
            INSERT INTO gamification_xp_logs (id, user_id, company_id, amount, action, source_id, created_at)
            VALUES (gen_random_uuid(), p_user_id, p_company_id, r.xp_recompense, 'badge_recompense', r.badge_id, now());
          END IF;
        END LOOP;
      END;
      $$;
    `);

    // --- Fix Bug 1: trigger séance terminée → écouter CLOSED (pas COMPLETED) ---
    // 'COMPLETED' n'est jamais stocké: l'app persiste CLOSED via cr_validation.
    // 'COMPLETED' n'existe qu'en tant que statut calculé (getEffectiveStatus) à la lecture.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION tr_gamification_on_session_completed()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        IF NEW.status = 'CLOSED' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'CLOSED') THEN
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

    // --- Fix Bug 3: trigger CR → ajouter AFTER INSERT ---
    // Pour couvrir les cas où un rapport serait créé directement en statut 'submitted'.
    // La fonction existante gère déjà OLD=NULL (OLD.status IS NULL → true).
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tr_gamification_report_submitted_insert ON session_reports
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_gamification_report_submitted_insert
        AFTER INSERT ON session_reports
        FOR EACH ROW
        EXECUTE PROCEDURE tr_gamification_on_report_submitted()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer le trigger INSERT ajouté
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tr_gamification_report_submitted_insert ON session_reports
    `);

    // Restaurer gamification_update_niveau original (avec filtre company_id)
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

    // Restaurer gamification_evaluate_badges original (avec filtre company_id)
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

    // Restaurer le trigger séance original (COMPLETED)
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
  }
}
