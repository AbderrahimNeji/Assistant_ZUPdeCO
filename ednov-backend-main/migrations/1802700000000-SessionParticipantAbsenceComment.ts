import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add absence_comment column to session_participants for optional absence comments.
 */
export class SessionParticipantAbsenceComment1802700000000 implements MigrationInterface {
  name = 'SessionParticipantAbsenceComment1802700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE session_participants ADD COLUMN absence_comment TEXT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE session_participants DROP COLUMN absence_comment`,
    );
  }
}
