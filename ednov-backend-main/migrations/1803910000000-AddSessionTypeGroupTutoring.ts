import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds collective session type `group_tutoring` (UI label: Tutorat).
 * Same pairing rules as homework_help / workshop (not whole_class).
 */
export class AddSessionTypeGroupTutoring1803910000000 implements MigrationInterface {
  name = 'AddSessionTypeGroupTutoring1803910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sessions DROP CONSTRAINT sessions_type_check`);

    await queryRunner.query(`
      ALTER TABLE sessions
      ADD CONSTRAINT sessions_type_check
      CHECK (type = ANY (ARRAY[
        'homework_help'::varchar,
        'individual_tutoring'::varchar,
        'workshop'::varchar,
        'whole_class'::varchar,
        'group_tutoring'::varchar
      ]))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE sessions SET type = 'homework_help' WHERE type = 'group_tutoring'
    `);

    await queryRunner.query(`ALTER TABLE sessions DROP CONSTRAINT sessions_type_check`);

    await queryRunner.query(`
      ALTER TABLE sessions
      ADD CONSTRAINT sessions_type_check
      CHECK (type = ANY (ARRAY[
        'homework_help'::varchar,
        'individual_tutoring'::varchar,
        'workshop'::varchar,
        'whole_class'::varchar
      ]))
    `);
  }
}
