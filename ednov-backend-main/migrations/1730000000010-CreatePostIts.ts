import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostIts1730000000010 implements MigrationInterface {
  name = 'CreatePostIts1730000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types — idempotent (new DB may already have them)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE post_it_thematic AS ENUM (
          'seances', 'matching', 'tuteur', 'eleves',
          'etablissements', 'administration', 'autres'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE post_it_status AS ENUM ('en_cours', 'depasse', 'done');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE post_it_color AS ENUM (
          'jaune', 'orange', 'rose', 'vert', 'violet', 'bleu', 'turquoise'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE post_it_permission AS ENUM ('read', 'write');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Create post_its table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS post_its (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        thematic post_it_thematic NOT NULL,
        content TEXT NOT NULL,
        deadline TIMESTAMPTZ,
        status post_it_status NOT NULL DEFAULT 'en_cours',
        color post_it_color NOT NULL DEFAULT 'jaune',
        is_archived BOOLEAN NOT NULL DEFAULT false,
        is_priority BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
    `);

    // Create indexes for post_its
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_its_company_archived 
      ON post_its(company_id, is_archived);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_its_company_created_by 
      ON post_its(company_id, created_by_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_its_company_deadline 
      ON post_its(company_id, deadline);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_its_company_priority_deadline 
      ON post_its(company_id, is_priority, deadline);
    `);

    // Create post_it_shares table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS post_it_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_it_id UUID NOT NULL REFERENCES post_its(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission post_it_permission NOT NULL DEFAULT 'read',
        shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        shared_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(post_it_id, user_id)
      );
    `);

    // Create indexes for post_it_shares
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_it_shares_post_it 
      ON post_it_shares(post_it_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_post_it_shares_user 
      ON post_it_shares(user_id);
    `);

    // Add trigger for updated_at on post_its
    await queryRunner.query(`
      CREATE TRIGGER tr_post_its_updated_at
      BEFORE UPDATE ON post_its
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at();
    `);

    // Add trigger for updated_at on post_it_shares
    await queryRunner.query(`
      CREATE TRIGGER tr_post_it_shares_updated_at
      BEFORE UPDATE ON post_it_shares
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_post_it_shares_updated_at ON post_it_shares;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS tr_post_its_updated_at ON post_its;`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_it_shares_user;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_it_shares_post_it;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_its_company_priority_deadline;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_its_company_deadline;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_its_company_created_by;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_post_its_company_archived;`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS post_it_shares;`);
    await queryRunner.query(`DROP TABLE IF EXISTS post_its;`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS post_it_permission;`);
    await queryRunner.query(`DROP TYPE IF EXISTS post_it_color;`);
    await queryRunner.query(`DROP TYPE IF EXISTS post_it_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS post_it_thematic;`);
  }
}
