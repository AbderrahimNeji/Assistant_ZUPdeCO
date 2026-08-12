import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfessionalSituationToUserProfiles1803000000000 implements MigrationInterface {
  name = 'AddProfessionalSituationToUserProfiles1803000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."professional_situation_enum"
        AS ENUM ('employee', 'student', 'retired')
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profiles"
        ADD COLUMN "professional_situation" "public"."professional_situation_enum" NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "professional_situation"`);
    await queryRunner.query(`DROP TYPE "public"."professional_situation_enum"`);
  }
}
