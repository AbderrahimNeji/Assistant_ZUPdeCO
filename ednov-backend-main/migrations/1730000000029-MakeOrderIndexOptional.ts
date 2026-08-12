import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrderIndexOptional1730000000029 implements MigrationInterface {
  name = 'MakeOrderIndexOptional1730000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make order_index nullable and remove default values in activities table
    await queryRunner.query(`
      ALTER TABLE activities 
      ALTER COLUMN order_index DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE activities 
      ALTER COLUMN order_index DROP DEFAULT
    `);

    // Make order_index nullable and remove default values in activity_types table
    await queryRunner.query(`
      ALTER TABLE activity_types 
      ALTER COLUMN order_index DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE activity_types 
      ALTER COLUMN order_index DROP DEFAULT
    `);

    // Make order_index nullable and remove default values in levels table
    await queryRunner.query(`
      ALTER TABLE levels 
      ALTER COLUMN order_index DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE levels 
      ALTER COLUMN order_index DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore default values and NOT NULL constraints for levels table
    await queryRunner.query(`
      ALTER TABLE levels 
      ALTER COLUMN order_index SET DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE levels 
      ALTER COLUMN order_index SET NOT NULL
    `);

    // Restore default values and NOT NULL constraints for activity_types table
    await queryRunner.query(`
      ALTER TABLE activity_types 
      ALTER COLUMN order_index SET DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE activity_types 
      ALTER COLUMN order_index SET NOT NULL
    `);

    // Restore default values and NOT NULL constraints for activities table
    await queryRunner.query(`
      ALTER TABLE activities 
      ALTER COLUMN order_index SET DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE activities 
      ALTER COLUMN order_index SET NOT NULL
    `);
  }
}
