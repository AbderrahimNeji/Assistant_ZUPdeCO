import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Session student-tutor pairs: explicit assignment of students to tutors per session.
 * One student per session has at most one tutor (unique on session_id, student_user_id).
 */
export class SessionStudentTutorPairs1730000000018 implements MigrationInterface {
  name = 'SessionStudentTutorPairs1730000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE session_student_tutor_pairs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
        student_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        tutor_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        assignment_source VARCHAR(30) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_session_student_tutor_pair_session_student UNIQUE (session_id, student_user_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_session_student_tutor_pairs_session_id ON session_student_tutor_pairs (session_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_session_student_tutor_pairs_tutor_user_id ON session_student_tutor_pairs (tutor_user_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_session_student_tutor_pairs_tutor_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_session_student_tutor_pairs_session_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS session_student_tutor_pairs`);
  }
}
