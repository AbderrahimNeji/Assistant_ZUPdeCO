import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlancCassePostItColor1778667600419 implements MigrationInterface {
  name = 'AddBlancCassePostItColor1778667600419';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE post_it_color ADD VALUE IF NOT EXISTS 'blanc-casse';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot remove enum value in PostgreSQL without recreating the type
    // The value will remain in the database
  }
}
