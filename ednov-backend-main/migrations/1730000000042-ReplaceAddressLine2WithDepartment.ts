import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceAddressLine2WithDepartment1730000000042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE establishments ADD COLUMN department VARCHAR(100) NULL;
    `);

    await queryRunner.query(`
      UPDATE establishments 
      SET department = address_line2 
      WHERE address_line2 IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE establishments DROP COLUMN address_line2;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE establishments ADD COLUMN address_line2 VARCHAR(255) NULL;
    `);

    await queryRunner.query(`
      UPDATE establishments 
      SET address_line2 = department 
      WHERE department IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE establishments DROP COLUMN department;
    `);
  }
}
