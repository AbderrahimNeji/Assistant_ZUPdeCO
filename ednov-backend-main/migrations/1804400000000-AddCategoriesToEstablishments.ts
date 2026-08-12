import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoriesToEstablishments1804400000000 implements MigrationInterface {
  name = 'AddCategoriesToEstablishments1804400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "establishments" ADD COLUMN "establi_category" VARCHAR(20) NULL`,
    );

    await queryRunner.query(`
      UPDATE "establishments"
      SET "establi_category" = CASE gov_data->>'statut_public_prive'
        WHEN 'Public' THEN 'public'
        WHEN 'Privé'  THEN 'private'
      END
      WHERE gov_data->>'statut_public_prive' IN ('Public', 'Privé')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "establishments" DROP COLUMN "establi_category"`);
  }
}
