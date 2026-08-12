import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitStudentAddressFields1730000000043 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_profiles ADD COLUMN address_line1 VARCHAR(255) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles ADD COLUMN department VARCHAR(100) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles ADD COLUMN postal_code VARCHAR(20) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles ADD COLUMN city VARCHAR(100) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles ADD COLUMN country VARCHAR(2) DEFAULT 'FR';
    `);

    await queryRunner.query(`
      UPDATE user_profiles 
      SET address_line1 = address 
      WHERE address IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles RENAME COLUMN address TO address_legacy;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_profiles RENAME COLUMN address_legacy TO address;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles DROP COLUMN address_line1;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles DROP COLUMN department;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles DROP COLUMN postal_code;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles DROP COLUMN city;
    `);

    await queryRunner.query(`
      ALTER TABLE user_profiles DROP COLUMN country;
    `);
  }
}
