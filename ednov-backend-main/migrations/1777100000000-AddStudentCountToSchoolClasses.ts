import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentCountToSchoolClasses1777100000000 implements MigrationInterface {
  name = 'AddStudentCountToSchoolClasses1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const col = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'school_classes'
        AND column_name = 'student_count'
    `);

    if (col.length === 0) {
      await queryRunner.query(`
        ALTER TABLE school_classes
        ADD COLUMN student_count INTEGER
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE school_classes
      DROP COLUMN IF EXISTS student_count
    `);
  }
}
