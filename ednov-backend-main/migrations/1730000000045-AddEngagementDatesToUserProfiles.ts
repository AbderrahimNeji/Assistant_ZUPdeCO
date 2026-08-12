import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEngagementDatesToUserProfiles1730000000045
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "date_debut_engagement" DATE NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      ADD COLUMN "date_fin_engagement" DATE NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP COLUMN "date_fin_engagement";
    `);

    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      DROP COLUMN "date_debut_engagement";
    `);
  }
}
