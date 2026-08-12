import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSpecialtyLevels1746000000000 implements MigrationInterface {
  name = 'CreateSpecialtyLevels1746000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "specialty_levels" (
        "specialty_id" UUID NOT NULL REFERENCES "specialties"("id") ON DELETE CASCADE,
        "level_id"     UUID NOT NULL REFERENCES "levels"("id")     ON DELETE CASCADE,
        PRIMARY KEY ("specialty_id", "level_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "specialty_levels"`);
  }
}
