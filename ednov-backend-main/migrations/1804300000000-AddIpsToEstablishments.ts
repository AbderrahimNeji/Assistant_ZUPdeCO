import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIpsToEstablishments1804300000000 implements MigrationInterface {
  name = 'AddIpsToEstablishments1804300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "establishments" ADD COLUMN "ips_value" NUMERIC(6,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "establishments" ADD COLUMN "ips_year" VARCHAR(20) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "establishments" ADD COLUMN "ips_source" VARCHAR(100) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "establishments" DROP COLUMN "ips_source"`);
    await queryRunner.query(`ALTER TABLE "establishments" DROP COLUMN "ips_year"`);
    await queryRunner.query(`ALTER TABLE "establishments" DROP COLUMN "ips_value"`);
  }
}
