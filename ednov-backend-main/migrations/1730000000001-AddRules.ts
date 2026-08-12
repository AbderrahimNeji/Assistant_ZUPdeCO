import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds rules and rule_overrides tables (matching engine).
 * Aligned with full-schema: company_id, snake_case, BaseEntity-style timestamps.
 */
export class AddRules1730000000001 implements MigrationInterface {
  name = 'AddRules1730000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE rules (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id              UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
        name                    VARCHAR(255) NOT NULL,
        scope                   VARCHAR(20) NOT NULL
          CHECK (scope IN ('GLOBAL', 'COMPANY')),
        priority                INT NOT NULL,
        criteria                JSONB NOT NULL DEFAULT '{}',
        active                  BOOLEAN NOT NULL DEFAULT true,
        allow_company_override  BOOLEAN NOT NULL DEFAULT false,
        allow_user_toggle       BOOLEAN NOT NULL DEFAULT false,
        version                 INT NOT NULL DEFAULT 1,
        description             TEXT,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_rules_company_id ON rules (company_id)`);
    await queryRunner.query(`CREATE INDEX idx_rules_scope_company ON rules (scope, company_id)`);
    await queryRunner.query(`CREATE INDEX idx_rules_active ON rules (active)`);
    await queryRunner.query(`CREATE INDEX idx_rules_priority ON rules (priority)`);

    await queryRunner.query(`
      CREATE TABLE rule_overrides (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id     UUID NOT NULL REFERENCES rules (id) ON DELETE CASCADE,
        company_id  UUID REFERENCES companies (id) ON DELETE SET NULL,
        user_id     UUID REFERENCES users (id) ON DELETE SET NULL,
        criteria    JSONB,
        active      BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_rule_overrides_rule_company ON rule_overrides (rule_id, company_id)`);
    await queryRunner.query(`CREATE INDEX idx_rule_overrides_rule_user ON rule_overrides (rule_id, user_id)`);

    await queryRunner.query(`
      CREATE TRIGGER tr_rules_updated_at
        BEFORE UPDATE ON rules FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_rule_overrides_updated_at
        BEFORE UPDATE ON rule_overrides FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_rule_overrides_updated_at ON rule_overrides`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_rules_updated_at ON rules`);
    await queryRunner.query(`DROP TABLE IF EXISTS rule_overrides`);
    await queryRunner.query(`DROP TABLE IF EXISTS rules`);
  }
}
