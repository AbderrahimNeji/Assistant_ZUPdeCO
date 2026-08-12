import { MigrationInterface, QueryRunner } from 'typeorm';

export class VacationZonesAndHolidayVacationZone1743700000000 implements MigrationInterface {
  name = 'VacationZonesAndHolidayVacationZone1743700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vacation_zones (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id    UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        code          VARCHAR(10) NOT NULL,
        name          VARCHAR(255) NOT NULL,
        description   TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at    TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vacation_zones_company_id ON vacation_zones (company_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_vacation_zones_company_code
        ON vacation_zones (company_id, code)
        WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vacation_zones_deleted_at ON vacation_zones (deleted_at)
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tr_vacation_zones_updated_at ON vacation_zones
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_vacation_zones_updated_at
        BEFORE UPDATE ON vacation_zones FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);

    const col = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'holidays' AND column_name = 'vacation_zone_id'
    `);
    if (col.length === 0) {
      await queryRunner.query(`
        ALTER TABLE holidays
        ADD COLUMN vacation_zone_id UUID REFERENCES vacation_zones (id) ON DELETE SET NULL
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_vacation_zone_id ON holidays (vacation_zone_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_holidays_vacation_zone_id`);
    await queryRunner.query(`ALTER TABLE holidays DROP COLUMN IF EXISTS vacation_zone_id`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_vacation_zones_updated_at ON vacation_zones`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vacation_zones_deleted_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_vacation_zones_company_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_vacation_zones_company_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS vacation_zones`);
  }
}
