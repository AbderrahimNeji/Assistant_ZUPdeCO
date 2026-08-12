import { MigrationInterface, QueryRunner } from 'typeorm';

export class TutorCriminalRecords1730000000033 implements MigrationInterface {
  name = 'TutorCriminalRecords1730000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_profiles
        ADD COLUMN tutor_platform_status VARCHAR(20) NOT NULL DEFAULT 'active'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN user_profiles.tutor_platform_status IS
      'Business tutor activation: pending until criminal record validated, active after (separate from users.status)'
    `);

    await queryRunner.query(`
      CREATE TABLE tutor_criminal_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        storage_path VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        deposited_at TIMESTAMPTZ NOT NULL,
        validated_at TIMESTAMPTZ,
        validated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_tutor_criminal_records_company_user UNIQUE (company_id, user_id),
        CONSTRAINT chk_tutor_criminal_records_status CHECK (status IN ('pending', 'validated'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_tutor_criminal_records_company_user ON tutor_criminal_records(company_id, user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_tutor_criminal_records_company_status ON tutor_criminal_records(company_id, status)
    `);
    await queryRunner.query(`
      CREATE TRIGGER tr_tutor_criminal_records_updated_at
      BEFORE UPDATE ON tutor_criminal_records FOR EACH ROW EXECUTE PROCEDURE set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_tutor_criminal_records_updated_at ON tutor_criminal_records`);
    await queryRunner.query(`DROP TABLE IF EXISTS tutor_criminal_records`);
    await queryRunner.query(`ALTER TABLE user_profiles DROP COLUMN IF EXISTS tutor_platform_status`);
  }
}
