import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Daily VSC establishment reports (one row per VSC per establishment per calendar day).
 * Cron 22h: create for tomorrow when ≥1 non-cancelled session; visible_at from first session schedule.
 * availability_notified_at: after visible_at, minute cron sends VSC_DAILY_REPORT_AVAILABLE (real-time channel).
 */
export class CreateVscDailyReports1801000000000 implements MigrationInterface {
  name = 'CreateVscDailyReports1801000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "vsc_daily_reports" (
        "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id"               UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
        "establishment_id"         UUID NOT NULL REFERENCES "establishments"("id") ON DELETE CASCADE,
        "report_date"              DATE NOT NULL,
        "vsc_user_id"              UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "rating"                   SMALLINT,
        "comment"                  TEXT,
        "status"                   VARCHAR(20) NOT NULL DEFAULT 'to_fill',
        "visible_at"               TIMESTAMPTZ NOT NULL,
        "availability_notified_at" TIMESTAMPTZ,
        "unlock_session_id"        UUID REFERENCES "sessions"("id") ON DELETE SET NULL,
        "generated_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "submitted_at"             TIMESTAMPTZ,
        "validated_by"             UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "validated_at"             TIMESTAMPTZ,
        "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "chk_vsc_daily_reports_status" CHECK ("status" IN ('to_fill', 'submitted', 'validated')),
        CONSTRAINT "chk_vsc_daily_reports_rating" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5))
      );
    `);

    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_vsc_daily_reports_scope"
        ON "vsc_daily_reports" ("company_id", "establishment_id", "report_date", "vsc_user_id");
    `);

    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_vsc_daily_reports_est_date"
        ON "vsc_daily_reports" ("establishment_id", "report_date");
    `);

    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_vsc_daily_reports_vsc_date"
        ON "vsc_daily_reports" ("vsc_user_id", "report_date");
    `);

    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_vsc_daily_reports_notify_pending"
        ON "vsc_daily_reports" ("visible_at")
        WHERE "availability_notified_at" IS NULL;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "vsc_daily_reports";`);
  }
}
