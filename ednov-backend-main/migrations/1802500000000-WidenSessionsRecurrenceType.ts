import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * recurrence_type values include 'several_days_per_week' (21 chars) but the column was VARCHAR(20).
 */
export class WidenSessionsRecurrenceType1802500000000 implements MigrationInterface {
  name = 'WidenSessionsRecurrenceType1802500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions
      ALTER COLUMN recurrence_type TYPE VARCHAR(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sessions
      ALTER COLUMN recurrence_type TYPE VARCHAR(20)
    `);
  }
}
