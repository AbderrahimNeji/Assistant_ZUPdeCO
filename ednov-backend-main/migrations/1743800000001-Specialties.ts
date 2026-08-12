import { MigrationInterface, QueryRunner } from 'typeorm';

export class Specialties1743800000001 implements MigrationInterface {
  name = 'Specialties1743800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS specialties (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code        VARCHAR(64) NOT NULL,
        label       VARCHAR(255) NOT NULL,
        sort_order  INT NOT NULL DEFAULT 0,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_specialties_code ON specialties (code)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_specialties_is_active ON specialties (is_active)
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tr_specialties_updated_at ON specialties
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_specialties_updated_at
        BEFORE UPDATE ON specialties FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS establishment_specialties (
        establishment_id UUID NOT NULL REFERENCES establishments (id) ON DELETE CASCADE,
        specialty_id     UUID NOT NULL REFERENCES specialties (id) ON DELETE CASCADE,
        PRIMARY KEY (establishment_id, specialty_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_establishment_specialties_specialty_id
        ON establishment_specialties (specialty_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_profile_specialties (
        user_profile_id UUID NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
        specialty_id    UUID NOT NULL REFERENCES specialties (id) ON DELETE CASCADE,
        PRIMARY KEY (user_profile_id, specialty_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_profile_specialties_specialty_id
        ON user_profile_specialties (specialty_id)
    `);

    const count = await queryRunner.query(`SELECT COUNT(*)::int AS c FROM specialties`);
    if (count[0]?.c === 0) {
      const rows: { code: string; label: string; sort: number }[] = [
        { code: 'mathematiques', label: 'Mathématiques', sort: 10 },
        { code: 'physique_chimie', label: 'Physique-Chimie', sort: 20 },
        { code: 'svt', label: 'SVT', sort: 30 },
        { code: 'ses', label: 'Sciences économiques et sociales (SES)', sort: 40 },
        { code: 'hggsp', label: 'Histoire-Géographie, Géopolitique et Sciences Politiques (HGGSP)', sort: 50 },
        { code: 'hlp', label: 'Humanités, Littérature et Philosophie (HLP)', sort: 60 },
        { code: 'llcer', label: 'Langues, Littératures et Cultures Étrangères et Régionales (LLCER)', sort: 70 },
        { code: 'nsi', label: 'Numérique et Sciences Informatiques (NSI)', sort: 80 },
        { code: 'sciences_ingenieur', label: 'Sciences de l’ingénieur', sort: 90 },
        { code: 'arts', label: 'Arts (ou décliné)', sort: 100 },
        { code: 'llca', label: 'Littérature, Langues et Cultures de l’Antiquité (LLCA – latin / grec)', sort: 110 },
        { code: 'eppcs', label: 'Éducation physique, pratiques et culture sportives (EPPCS)', sort: 120 },
        { code: 'biologie_ecologie', label: 'Biologie-écologie', sort: 130 },
      ];
      for (const r of rows) {
        await queryRunner.query(
          `INSERT INTO specialties (code, label, sort_order) VALUES ($1, $2, $3)`,
          [r.code, r.label, r.sort],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_profile_specialties`);
    await queryRunner.query(`DROP TABLE IF EXISTS establishment_specialties`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_specialties_updated_at ON specialties`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_specialties_is_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_specialties_code`);
    await queryRunner.query(`DROP TABLE IF EXISTS specialties`);
  }
}
