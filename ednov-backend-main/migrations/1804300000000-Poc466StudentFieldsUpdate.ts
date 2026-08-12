import { MigrationInterface, QueryRunner } from 'typeorm';

/** POC-466 — Ajoute la section handicap, le motif de désactivation et la date de sortie. */
export class Poc466StudentFieldsUpdate1804300000000 implements MigrationInterface {
  name = 'Poc466StudentFieldsUpdate1804300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nouvelles colonnes handicap (is_disabled, disability_types JSONB, disability_other_note)
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
        ADD COLUMN IF NOT EXISTS "is_disabled"           BOOLEAN      NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "disability_types"      JSONB        NULL,
        ADD COLUMN IF NOT EXISTS "disability_other_note" VARCHAR(200) NULL,
        ADD COLUMN IF NOT EXISTS "exit_date"             TIMESTAMPTZ  NULL;
    `);

    // Motif de désactivation — renseigné uniquement quand new_status = 'deactivated'
    await queryRunner.query(`
      ALTER TABLE "student_status_history"
        ADD COLUMN IF NOT EXISTS "reason" VARCHAR(200) NULL;
    `);

    // Backfill exit_date : dernière désactivation pour les élèves actuellement désactivés
    await queryRunner.query(`
      UPDATE "user_profiles" up
      SET "exit_date" = sub.latest_deactivation
      FROM (
        SELECT ssh.student_user_id, MAX(ssh.created_at) AS latest_deactivation
        FROM student_status_history ssh
        INNER JOIN users u ON u.id = ssh.student_user_id AND u.status = 'deactivated'
        WHERE ssh.new_status = 'deactivated'
        GROUP BY ssh.student_user_id
      ) sub
      WHERE up.user_id = sub.student_user_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_status_history"
        DROP COLUMN IF EXISTS "reason";
    `);

    await queryRunner.query(`
      ALTER TABLE "user_profiles"
        DROP COLUMN IF EXISTS "exit_date",
        DROP COLUMN IF EXISTS "disability_other_note",
        DROP COLUMN IF EXISTS "disability_types",
        DROP COLUMN IF EXISTS "is_disabled";
    `);
  }
}
