import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The session type 'other' was renamed to 'whole_class' in the application code.
 * This migration updates the check constraint accordingly and backfills existing rows.
 */
export class RenameSessionTypeOtherToWholeClass1803700000000 implements MigrationInterface {
  name = 'RenameSessionTypeOtherToWholeClass1803700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sessions DROP CONSTRAINT sessions_type_check`);

    await queryRunner.query(`UPDATE sessions SET type = 'whole_class' WHERE type = 'other'`);

    await queryRunner.query(`
      ALTER TABLE sessions
      ADD CONSTRAINT sessions_type_check
      CHECK (type = ANY (ARRAY['homework_help'::varchar, 'individual_tutoring'::varchar, 'workshop'::varchar, 'whole_class'::varchar]))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sessions DROP CONSTRAINT sessions_type_check`);

    await queryRunner.query(`UPDATE sessions SET type = 'other' WHERE type = 'whole_class'`);

    await queryRunner.query(`
      ALTER TABLE sessions
      ADD CONSTRAINT sessions_type_check
      CHECK (type = ANY (ARRAY['homework_help'::varchar, 'individual_tutoring'::varchar, 'workshop'::varchar, 'other'::varchar]))
    `);
  }
}
