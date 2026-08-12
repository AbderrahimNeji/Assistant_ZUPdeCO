import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Activity config: max students per tutor per session (for assignment cap and balanced distribution).
 */
export class ActivityMaxStudentsPerTutor1730000000021 implements MigrationInterface {
  name = 'ActivityMaxStudentsPerTutor1730000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE activities ADD COLUMN max_students_per_tutor INT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE activities DROP COLUMN IF EXISTS max_students_per_tutor`);
  }
}
