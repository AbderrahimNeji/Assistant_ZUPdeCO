import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CR XP for `cr_soumis` is awarded in Nest (SessionsService) on first transition
 * to `submitted` by the acting tutor/volunteer participant, with idempotence via
 * gamification_xp_logs (report id + legacy session id as source_id).
 *
 * Disables the DB trigger that credited `author_id` to avoid double grants.
 */
export class CrSubmitXpNestActorDisableDbTrigger1802700000000 implements MigrationInterface {
  name = 'CrSubmitXpNestActorDisableDbTrigger1802700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION tr_gamification_on_report_submitted()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- XP for first CR submit: NestJS (SessionsService + GamificationService.tryAwardCrFirstSubmitXp).
        RETURN NEW;
      END;
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
  }
}
