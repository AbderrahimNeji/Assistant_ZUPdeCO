import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetHoursToUserProfiles1804900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "target_hours" DECIMAL(10,2) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP COLUMN "target_hours";
    `);
  }
}
