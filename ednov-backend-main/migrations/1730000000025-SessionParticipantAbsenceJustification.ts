import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add absence_justification column to session_participants for optional justification of absence.
 */
export class SessionParticipantAbsenceJustification1730000000025 implements MigrationInterface {
  name = 'SessionParticipantAbsenceJustification1730000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE session_participants ADD COLUMN absence_justification TEXT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE session_participants DROP COLUMN absence_justification`,
    );
  }
}
