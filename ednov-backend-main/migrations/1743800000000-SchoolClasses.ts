import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchoolClasses1743800000000 implements MigrationInterface {
  name = 'SchoolClasses1743800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS school_classes (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id       UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        establishment_id UUID NOT NULL REFERENCES establishments (id) ON DELETE CASCADE,
        school_year_id   UUID NOT NULL REFERENCES school_years (id) ON DELETE RESTRICT,
        level_id         UUID NOT NULL REFERENCES levels (id) ON DELETE RESTRICT,
        name             VARCHAR(255) NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at       TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_school_classes_company_id ON school_classes (company_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_school_classes_establishment_id ON school_classes (establishment_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_school_classes_school_year_id ON school_classes (school_year_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_school_classes_level_id ON school_classes (level_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_school_classes_deleted_at ON school_classes (deleted_at)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_school_classes_establishment_year_name
        ON school_classes (establishment_id, school_year_id, lower(trim(name)))
        WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tr_school_classes_updated_at ON school_classes
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_school_classes_updated_at
        BEFORE UPDATE ON school_classes FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    const col = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'school_class_id'
    `);
    if (col.length === 0) {
      await queryRunner.query(`
        ALTER TABLE user_profiles
        ADD COLUMN school_class_id UUID REFERENCES school_classes (id) ON DELETE SET NULL
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_user_profiles_school_class_id ON user_profiles (school_class_id)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_profiles_school_class_id`);
    await queryRunner.query(`ALTER TABLE user_profiles DROP COLUMN IF EXISTS school_class_id`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_school_classes_updated_at ON school_classes`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_school_classes_establishment_year_name`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_classes_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_classes_level_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_classes_school_year_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_classes_establishment_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_school_classes_company_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS school_classes`);
  }
}
