import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQpvPartnershipToEstablishments1804600000000 implements MigrationInterface {
  name = 'AddQpvPartnershipToEstablishments1804600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "establishments"
        ADD COLUMN "is_qpv"                           BOOLEAN NULL,
        ADD COLUMN "renewal_next_year"                BOOLEAN NULL,
        ADD COLUMN "has_devoirs_faits"                BOOLEAN NULL,
        ADD COLUMN "has_internat"                     BOOLEAN NULL,
        ADD COLUMN "involvement_level"                SMALLINT NULL CHECK (involvement_level BETWEEN 1 AND 5),
        ADD COLUMN "partner_relationship_quality"     VARCHAR(20) NULL,
        ADD COLUMN "convention_signed"                BOOLEAN NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "establishments"
        DROP COLUMN "is_qpv",
        DROP COLUMN "renewal_next_year",
        DROP COLUMN "has_devoirs_faits",
        DROP COLUMN "has_internat",
        DROP COLUMN "involvement_level",
        DROP COLUMN "partner_relationship_quality",
        DROP COLUMN "convention_signed"
    `);
  }
}
