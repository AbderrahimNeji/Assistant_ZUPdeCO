import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactFunctions1743700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create contact_functions table
    await queryRunner.query(`
      CREATE TABLE contact_functions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        label VARCHAR(100) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT uq_contact_functions_company_label UNIQUE(company_id, label)
      );

      COMMENT ON TABLE contact_functions IS 'Dynamic list of contact functions for establishments';
      COMMENT ON COLUMN contact_functions.label IS 'Function label (e.g., Référent, Directeur, CPE)';
      COMMENT ON COLUMN contact_functions.is_default IS 'Whether this is a default function provided by the system';
      COMMENT ON COLUMN contact_functions.usage_count IS 'Number of times this function has been used';

      CREATE INDEX idx_contact_functions_company_id ON contact_functions(company_id);
      CREATE INDEX idx_contact_functions_label ON contact_functions(label);
      CREATE INDEX idx_contact_functions_is_default ON contact_functions(is_default);
    `);

    // Insert default functions for all existing companies
    await queryRunner.query(`
      INSERT INTO contact_functions (company_id, label, is_default)
      SELECT 
        c.id,
        func.label,
        true
      FROM companies c
      CROSS JOIN (
        VALUES 
          ('Référent'),
          ('Directeur'),
          ('Surveillant'),
          ('CPE'),
          ('Proviseur'),
          ('Principal'),
          ('Adjoint')
      ) AS func(label)
      ON CONFLICT (company_id, label) DO NOTHING;
    `);

    // Create trigger to automatically add default functions for new companies
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION add_default_contact_functions()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO contact_functions (company_id, label, is_default)
        VALUES 
          (NEW.id, 'Référent', true),
          (NEW.id, 'Directeur', true),
          (NEW.id, 'Surveillant', true),
          (NEW.id, 'CPE', true),
          (NEW.id, 'Proviseur', true),
          (NEW.id, 'Principal', true),
          (NEW.id, 'Adjoint', true)
        ON CONFLICT (company_id, label) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_add_default_contact_functions
      AFTER INSERT ON companies
      FOR EACH ROW
      EXECUTE FUNCTION add_default_contact_functions();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_add_default_contact_functions ON companies`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS add_default_contact_functions`);
    await queryRunner.query(`DROP TABLE IF EXISTS contact_functions CASCADE`);
  }
}
