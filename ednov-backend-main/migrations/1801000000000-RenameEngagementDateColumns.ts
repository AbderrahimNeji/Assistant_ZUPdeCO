import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameEngagementDateColumns1801000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      RENAME COLUMN "date_debut_engagement" TO "engagement_start_date";
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      RENAME COLUMN "date_fin_engagement" TO "engagement_end_date";
    `);
    await queryRunner.query(`
      ALTER TABLE "establishments"
      RENAME COLUMN "date_debut_engagement" TO "engagement_start_date";
    `);
    await queryRunner.query(`
      ALTER TABLE "establishments"
      RENAME COLUMN "date_fin_engagement" TO "engagement_end_date";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "establishments"
      RENAME COLUMN "engagement_end_date" TO "date_fin_engagement";
    `);
    await queryRunner.query(`
      ALTER TABLE "establishments"
      RENAME COLUMN "engagement_start_date" TO "date_debut_engagement";
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      RENAME COLUMN "engagement_end_date" TO "date_fin_engagement";
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
      RENAME COLUMN "engagement_start_date" TO "date_debut_engagement";
    `);
  }
}
