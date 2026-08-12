import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassAndSpecialtiesToSessions1777200000000 implements MigrationInterface {
  name = 'AddClassAndSpecialtiesToSessions1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const classCol = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sessions'
        AND column_name = 'class_id'
    `);
    if (classCol.length === 0) {
      await queryRunner.query(`ALTER TABLE sessions ADD COLUMN class_id UUID NULL`);
    }

    const specialtyCol = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sessions'
        AND column_name = 'specialty_ids'
    `);
    if (specialtyCol.length === 0) {
      await queryRunner.query(`ALTER TABLE sessions ADD COLUMN specialty_ids JSONB NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sessions DROP COLUMN IF EXISTS class_id`);
    await queryRunner.query(`ALTER TABLE sessions DROP COLUMN IF EXISTS specialty_ids`);
  }
}
