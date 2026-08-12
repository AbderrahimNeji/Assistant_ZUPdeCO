import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanDuringHolidaysToSessions1776800000000 implements MigrationInterface {
  name = 'AddPlanDuringHolidaysToSessions1776800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS plan_during_holidays BOOLEAN NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions
      DROP COLUMN IF EXISTS plan_during_holidays
    `);
  }
}
