import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `notifications` table (in-app notifications for bell icon)
 * and adds time-anchor + idempotence columns on `session_reports` so that
 * 24h / 96h reminders can be triggered once per threshold.
 */
export class CreateNotifications1800000000000 implements MigrationInterface {
  name = 'CreateNotifications1800000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
        "user_id"    UUID NOT NULL REFERENCES "users"("id")     ON DELETE CASCADE,
        "type"       VARCHAR(64)  NOT NULL,
        "title"      VARCHAR(255) NOT NULL,
        "body"       TEXT,
        "payload"    JSONB,
        "dedupe_key" VARCHAR(255),
        "read_at"    TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_created"
        ON "notifications" ("user_id", "created_at" DESC);
    `);
    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread"
        ON "notifications" ("user_id") WHERE "read_at" IS NULL;
    `);
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_notifications_dedupe"
        ON "notifications" ("user_id", "type", "dedupe_key")
        WHERE "dedupe_key" IS NOT NULL;
    `);

    await q.query(`
      ALTER TABLE "session_reports"
        ADD COLUMN IF NOT EXISTS "to_complete_since"    TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "reminder_24h_sent_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "reminder_96h_sent_at" TIMESTAMPTZ;
    `);

    // Backfill: for existing reports currently in 'to_complete', anchor on created_at.
    await q.query(`
      UPDATE "session_reports"
         SET "to_complete_since" = COALESCE("to_complete_since", "created_at")
       WHERE "status" = 'to_complete'
         AND "to_complete_since" IS NULL;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "session_reports"
        DROP COLUMN IF EXISTS "reminder_96h_sent_at",
        DROP COLUMN IF EXISTS "reminder_24h_sent_at",
        DROP COLUMN IF EXISTS "to_complete_since";
    `);
    await q.query(`DROP INDEX IF EXISTS "uq_notifications_dedupe";`);
    await q.query(`DROP INDEX IF EXISTS "idx_notifications_user_unread";`);
    await q.query(`DROP INDEX IF EXISTS "idx_notifications_user_created";`);
    await q.query(`DROP TABLE IF EXISTS "notifications";`);
  }
}
