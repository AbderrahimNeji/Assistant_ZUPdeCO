import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriorityNetworkToEstablishments1804500000000 implements MigrationInterface {
  name = 'AddPriorityNetworkToEstablishments1804500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "establishments" ADD COLUMN "priority_network" VARCHAR(20) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "establishments" DROP COLUMN "priority_network"`,
    );
  }
}
