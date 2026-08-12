import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstablishmentContactsArray1730000000038 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "establishments"
      ADD COLUMN IF NOT EXISTS "contacts" jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);

    await queryRunner.query(`
      UPDATE "establishments"
      SET "contacts" = CASE
        WHEN COALESCE(NULLIF(BTRIM("contact_name"), ''), NULLIF(BTRIM("contact_email"), ''), NULLIF(BTRIM("contact_phone"), '')) IS NOT NULL
        THEN jsonb_build_array(
          jsonb_strip_nulls(
            jsonb_build_object(
              'contactName', NULLIF(BTRIM("contact_name"), ''),
              'contactEmail', NULLIF(BTRIM("contact_email"), ''),
              'contactPhone', NULLIF(BTRIM("contact_phone"), '')
            )
          )
        )
        ELSE '[]'::jsonb
      END
      WHERE "contacts" IS NULL OR "contacts" = '[]'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "establishments"
      DROP COLUMN IF EXISTS "contacts";
    `);
  }
}
