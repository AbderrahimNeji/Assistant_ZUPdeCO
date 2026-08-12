import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Uniqueness depends on session_type (denormalized on pairs).
 * - Non–whole_class: one tutor per student per session.
 * - whole_class: multiple tutors per student; unique (session, student, tutor).
 */
export class SessionStudentTutorPairUniquePerTutor1803800000000 implements MigrationInterface {
  name = 'SessionStudentTutorPairUniquePerTutor1803800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE session_student_tutor_pairs
      ADD COLUMN IF NOT EXISTS session_type VARCHAR(30)
    `);

    await queryRunner.query(`
      UPDATE session_student_tutor_pairs p
      SET session_type = s.type
      FROM sessions s
      WHERE s.id = p.session_id
        AND (p.session_type IS NULL OR p.session_type = '')
    `);

    await queryRunner.query(`
      UPDATE session_student_tutor_pairs
      SET session_type = 'homework_help'
      WHERE session_type IS NULL OR session_type = ''
    `);

    await queryRunner.query(`
      ALTER TABLE session_student_tutor_pairs
      ALTER COLUMN session_type SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE session_student_tutor_pairs
      DROP CONSTRAINT IF EXISTS uq_session_student_tutor_pair_session_student
    `);
    await queryRunner.query(`
      ALTER TABLE session_student_tutor_pairs
      DROP CONSTRAINT IF EXISTS uq_session_student_tutor_pair_session_student_tutor
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_sstp_one_tutor_per_student_non_whole_class
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_sstp_whole_class_student_tutor
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_sstp_one_tutor_per_student_non_whole_class
      ON session_student_tutor_pairs (session_id, student_user_id)
      WHERE session_type <> 'whole_class'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_sstp_whole_class_student_tutor
      ON session_student_tutor_pairs (session_id, student_user_id, tutor_user_id)
      WHERE session_type = 'whole_class'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_sstp_whole_class_student_tutor
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_sstp_one_tutor_per_student_non_whole_class
    `);

    await queryRunner.query(`
      ALTER TABLE session_student_tutor_pairs
      DROP CONSTRAINT IF EXISTS uq_session_student_tutor_pair_session_student_tutor
    `);

    await queryRunner.query(`
      ALTER TABLE session_student_tutor_pairs
      ADD CONSTRAINT uq_session_student_tutor_pair_session_student
      UNIQUE (session_id, student_user_id)
    `);

    await queryRunner.query(`
      ALTER TABLE session_student_tutor_pairs
      DROP COLUMN IF EXISTS session_type
    `);
  }
}
