import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentStatusHistory1800000000001 implements MigrationInterface {
  name = 'CreateStudentStatusHistory1800000000001';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "student_status_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "student_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "updated_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "old_status" VARCHAR(50) NULL,
        "new_status" VARCHAR(50) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_student_status_history_student_created"
      ON "student_status_history" ("student_user_id", "created_at" DESC)
    `);

    // Backfill depuis audit_logs (lignes USER_STATUS_CHANGE déjà présentes)
    await q.query(`
      INSERT INTO "student_status_history" (
        "id", "student_user_id", "updated_by", "old_status", "new_status", "created_at"
      )
      SELECT
        gen_random_uuid(),
        al."entity_id",
        al."user_id",
        al."old_value"->>'status',
        al."new_value"->>'status',
        al."created_at"
      FROM "audit_logs" al
      WHERE al."entity" = 'users'
        AND al."action" = 'USER_STATUS_CHANGE'
        AND al."old_value"->>'status' IS NOT NULL
        AND al."new_value"->>'status' IS NOT NULL
        AND al."old_value"->>'status' IN ('registered', 'accompanied', 'deactivated')
        AND al."new_value"->>'status' IN ('registered', 'accompanied', 'deactivated')
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "idx_student_status_history_student_created"`);
    await q.query(`DROP TABLE IF EXISTS "student_status_history"`);
  }
}
