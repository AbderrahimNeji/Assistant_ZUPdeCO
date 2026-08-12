import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstablishmentEngagementDates1730000000033
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "establishments"
      ADD COLUMN "date_debut_engagement" DATE NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "establishments"
      ADD COLUMN "date_fin_engagement" DATE NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "establishments"
      DROP COLUMN "date_fin_engagement";
    `);

    await queryRunner.query(`
      ALTER TABLE "establishments"
      DROP COLUMN "date_debut_engagement";
    `);
  }
}
