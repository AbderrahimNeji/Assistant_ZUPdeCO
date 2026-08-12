import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleConfigToAssignedPostItTemplates1803100000000 implements MigrationInterface {
  name = 'AddScheduleConfigToAssignedPostItTemplates1803100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add schedule_config column (JSONB, nullable for backward compatibility)
    await queryRunner.query(`
      ALTER TABLE assigned_post_it_templates
      ADD COLUMN schedule_config JSONB NULL;
    `);

    // Index for faster queries on schedule_config properties
    await queryRunner.query(`
      CREATE INDEX idx_assigned_post_it_templates_schedule_type 
      ON assigned_post_it_templates 
      USING gin ((schedule_config -> 'type'));
    `);

    // Index for recurrence mode
    await queryRunner.query(`
      CREATE INDEX idx_assigned_post_it_templates_recurrence_mode 
      ON assigned_post_it_templates 
      USING gin ((schedule_config -> 'recurrence' -> 'mode'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assigned_post_it_templates_recurrence_mode;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assigned_post_it_templates_schedule_type;`);
    await queryRunner.query(`
      ALTER TABLE assigned_post_it_templates
      DROP COLUMN IF EXISTS schedule_config;
    `);
  }
}
