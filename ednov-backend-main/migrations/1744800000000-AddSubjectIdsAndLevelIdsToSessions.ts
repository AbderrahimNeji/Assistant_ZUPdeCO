import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration : passage de 1→N pour levels et subjects sur sessions.
 *
 * Ajoute les colonnes jsonb level_ids / subject_ids / level_names / subject_names,
 * backfille depuis les colonnes unitaires, puis supprime ces dernières.
 *
 * Idempotent via IF EXISTS / IF NOT EXISTS.
 */
export class AddSubjectIdsAndLevelIdsToSessions1744800000000 implements MigrationInterface {
  name = 'AddSubjectIdsAndLevelIdsToSessions1744800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ajouter les nouvelles colonnes jsonb
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "level_ids"   jsonb NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "subject_ids" jsonb NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "level_names"   jsonb NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "subject_names" jsonb NOT NULL DEFAULT '[]'
    `);

    // 2. Backfill level_ids et level_names depuis level_id / level_name
    await queryRunner.query(`
      UPDATE "sessions"
      SET
        "level_ids"   = jsonb_build_array("level_id"::text),
        "level_names" = CASE
          WHEN "level_name" IS NOT NULL AND "level_name" <> ''
            THEN jsonb_build_array("level_name")
          ELSE '[]'::jsonb
        END
      WHERE "level_id" IS NOT NULL
        AND "level_ids" = '[]'::jsonb
    `);

    // 3. Backfill subject_ids et subject_names depuis subject_id / subject_name
    await queryRunner.query(`
      UPDATE "sessions"
      SET
        "subject_ids"   = jsonb_build_array("subject_id"::text),
        "subject_names" = CASE
          WHEN "subject_name" IS NOT NULL AND "subject_name" <> ''
            THEN jsonb_build_array("subject_name")
          ELSE '[]'::jsonb
        END
      WHERE "subject_id" IS NOT NULL
        AND "subject_ids" = '[]'::jsonb
    `);

    // 4. Supprimer les anciennes colonnes unitaires
    await queryRunner.query(`
      ALTER TABLE "sessions"
      DROP COLUMN IF EXISTS "level_id",
      DROP COLUMN IF EXISTS "subject_id",
      DROP COLUMN IF EXISTS "level_name",
      DROP COLUMN IF EXISTS "subject_name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restauration partielle : on recrée les colonnes unitaires depuis les tableaux
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "level_id"    uuid,
      ADD COLUMN IF NOT EXISTS "subject_id"  uuid,
      ADD COLUMN IF NOT EXISTS "level_name"   varchar(255),
      ADD COLUMN IF NOT EXISTS "subject_name" varchar(255)
    `);

    await queryRunner.query(`
      UPDATE "sessions"
      SET
        "level_id"   = ("level_ids" ->> 0)::uuid,
        "level_name" = "level_names" ->> 0
      WHERE jsonb_array_length("level_ids") > 0
    `);

    await queryRunner.query(`
      UPDATE "sessions"
      SET
        "subject_id"   = ("subject_ids" ->> 0)::uuid,
        "subject_name" = "subject_names" ->> 0
      WHERE jsonb_array_length("subject_ids") > 0
    `);

    await queryRunner.query(`
      ALTER TABLE "sessions"
      DROP COLUMN IF EXISTS "level_ids",
      DROP COLUMN IF EXISTS "subject_ids",
      DROP COLUMN IF EXISTS "level_names",
      DROP COLUMN IF EXISTS "subject_names"
    `);
  }
}
