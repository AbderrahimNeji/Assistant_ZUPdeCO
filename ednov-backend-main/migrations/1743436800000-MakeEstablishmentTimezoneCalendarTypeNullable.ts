import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeEstablishmentTimezoneCalendarTypeNullable1743436800000 implements MigrationInterface {
  name = 'MakeEstablishmentTimezoneCalendarTypeNullable1743436800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE establishments 
      ALTER COLUMN calendar_type DROP DEFAULT,
      ALTER COLUMN calendar_type DROP NOT NULL,
      ALTER COLUMN timezone DROP DEFAULT,
      ALTER COLUMN timezone DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE establishments 
      SET calendar_type = 'none' 
      WHERE calendar_type IS NULL
    `);
    
    await queryRunner.query(`
      UPDATE establishments 
      SET timezone = 'Europe/Paris' 
      WHERE timezone IS NULL
    `);
    
    await queryRunner.query(`
      ALTER TABLE establishments 
      ALTER COLUMN calendar_type SET DEFAULT 'none',
      ALTER COLUMN calendar_type SET NOT NULL,
      ALTER COLUMN timezone SET DEFAULT 'Europe/Paris',
      ALTER COLUMN timezone SET NOT NULL
    `);
  }
}
