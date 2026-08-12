import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Required for UNACCENT(...) in ILIKE search (users, companies, establishments).
 * On managed DBs, run manually if migration user lacks CREATE EXTENSION:
 *   CREATE EXTENSION IF NOT EXISTS unaccent;
 */
export class EnableUnaccentExtension1743600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
