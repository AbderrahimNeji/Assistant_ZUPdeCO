import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignedPostItTemplates1802800000000 implements MigrationInterface {
  name = 'CreateAssignedPostItTemplates1802800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. New enum for recurrence types
    await queryRunner.query(`
      CREATE TYPE assigned_post_it_recurrence AS ENUM (
        'weekly',
        'monthly',
        'quarterly',
        'annually',
        'specific_date'
      );
    `);

    // 2. New table — includes target_role_ids from the start
    await queryRunner.query(`
      CREATE TABLE assigned_post_it_templates (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        created_by_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title               VARCHAR(255) NOT NULL,
        thematic            VARCHAR(50) NOT NULL,
        content             TEXT NOT NULL,
        color               VARCHAR(20) NOT NULL DEFAULT 'jaune',
        is_priority         BOOLEAN NOT NULL DEFAULT false,
        target_role_ids     UUID[] NOT NULL DEFAULT '{}',
        target_role_code    VARCHAR(50) NULL,
        target_user_id      UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        recurrence_type     assigned_post_it_recurrence NULL,
        quarterly_periods   integer[] NULL,
        specific_date_from  TIMESTAMPTZ NULL,
        specific_date_to    TIMESTAMPTZ NULL,
        is_active           BOOLEAN NOT NULL DEFAULT true,
        last_provisioned_at TIMESTAMPTZ NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ NULL
      );
    `);

    // 3. Indexes
    await queryRunner.query(`
      CREATE INDEX idx_assigned_post_it_templates_company
        ON assigned_post_it_templates(company_id)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_assigned_post_it_templates_active
        ON assigned_post_it_templates(company_id, is_active)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_assigned_post_it_templates_role
        ON assigned_post_it_templates(target_role_code)
        WHERE target_role_code IS NOT NULL AND deleted_at IS NULL;
    `);

    // 4. updated_at trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_assigned_post_it_templates_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_assigned_post_it_templates_updated_at
        BEFORE UPDATE ON assigned_post_it_templates
        FOR EACH ROW
        EXECUTE FUNCTION update_assigned_post_it_templates_updated_at();
    `);

    // Note: interface_elements for this feature should be created via seed data
    // or dynamically at runtime, not in structural migrations.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_assigned_post_it_templates_updated_at ON assigned_post_it_templates;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_assigned_post_it_templates_updated_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assigned_post_it_templates_role;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assigned_post_it_templates_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assigned_post_it_templates_company;`);
    await queryRunner.query(`DROP TABLE IF EXISTS assigned_post_it_templates;`);
    await queryRunner.query(`DROP TYPE IF EXISTS assigned_post_it_recurrence;`);
  }
}
