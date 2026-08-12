import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration POC-300, POC-323, POC-328
 * 
 * POC-300: Modifier permissions reports.action-validate (volunteer uniquement, retirer coordinator)
 * POC-323: Ajouter colonnes validated_by/validated_at sur vsc_reports + nouvel IE action-validate pour vsc-reports
 * POC-328: Nouvel IE action-export pour interface reports
 */
export class Poc6TicketsChanges1745000000000 implements MigrationInterface {
  name = 'Poc6TicketsChanges1745000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // POC-323: Colonnes validated_by et validated_at sur vsc_reports
    // ========================================
    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      ADD COLUMN IF NOT EXISTS "validated_by" UUID,
      ADD COLUMN IF NOT EXISTS "validated_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "vsc_reports"
        ADD CONSTRAINT "FK_vsc_reports_validated_by"
        FOREIGN KEY ("validated_by")
        REFERENCES "users"("id")
        ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================
    // POC-300: Modifier permissions reports.action-validate
    // RETIRER coordinator, AJOUTER volunteer
    // ========================================
    await queryRunner.query(`
      -- Retirer accès coordinator à reports.action-validate
      DELETE FROM "role_interface_elements"
      WHERE "element_id" IN (
        SELECT "id" FROM "interface_elements" 
        WHERE "interface_name" = 'reports' 
          AND "element_id" = 'action-validate'
      )
      AND "role_id" IN (
        SELECT "id" FROM "roles" WHERE "code" = 'coordinator'
      )
    `);

    await queryRunner.query(`
      -- Donner accès volunteer à reports.action-validate
      INSERT INTO "role_interface_elements" 
        ("id", "company_id", "role_id", "element_id", "visible", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        r.company_id,
        r.id,
        ie.id,
        true,
        now(),
        now()
      FROM "roles" r, "interface_elements" ie
      WHERE r.code = 'volunteer'
        AND ie.interface_name = 'reports'
        AND ie.element_id = 'action-validate'
        AND NOT EXISTS (
          SELECT 1 FROM "role_interface_elements" rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
    `);

    // ========================================
    // POC-323: Nouvel IE action-validate pour vsc-reports
    // ========================================
    await queryRunner.query(`
      -- Créer l'IE action-validate pour vsc-reports
      INSERT INTO "interface_elements"
        ("id", "company_id", "interface_name", "element_id", "element_type", "element_label", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        c.id,
        'vsc-reports',
        'action-validate',
        'action',
        'Valider le rapport VSC',
        now(),
        now()
      FROM "companies" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "interface_elements" ie
        WHERE ie.company_id = c.id
          AND ie.interface_name = 'vsc-reports'
          AND ie.element_id = 'action-validate'
      )
    `);

    await queryRunner.query(`
      -- Donner accès coordinator, admin, manager à vsc-reports.action-validate
      INSERT INTO "role_interface_elements"
        ("id", "company_id", "role_id", "element_id", "visible", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        r.company_id,
        r.id,
        ie.id,
        true,
        now(),
        now()
      FROM "roles" r, "interface_elements" ie
      WHERE r.code IN ('coordinator', 'admin', 'manager')
        AND ie.interface_name = 'vsc-reports'
        AND ie.element_id = 'action-validate'
        AND NOT EXISTS (
          SELECT 1 FROM "role_interface_elements" rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
    `);

    // ========================================
    // POC-328: Nouvel IE action-export pour reports
    // ========================================
    await queryRunner.query(`
      -- Créer l'IE action-export pour reports
      INSERT INTO "interface_elements"
        ("id", "company_id", "interface_name", "element_id", "element_type", "element_label", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        c.id,
        'reports',
        'action-export',
        'action',
        'Exporter en Excel',
        now(),
        now()
      FROM "companies" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "interface_elements" ie
        WHERE ie.company_id = c.id
          AND ie.interface_name = 'reports'
          AND ie.element_id = 'action-export'
      )
    `);

    await queryRunner.query(`
      -- Donner accès admin, manager, coordinator à reports.action-export
      INSERT INTO "role_interface_elements"
        ("id", "company_id", "role_id", "element_id", "visible", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        r.company_id,
        r.id,
        ie.id,
        true,
        now(),
        now()
      FROM "roles" r, "interface_elements" ie
      WHERE r.code IN ('admin', 'manager', 'coordinator')
        AND ie.interface_name = 'reports'
        AND ie.element_id = 'action-export'
        AND NOT EXISTS (
          SELECT 1 FROM "role_interface_elements" rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback POC-328
    await queryRunner.query(`
      DELETE FROM "role_interface_elements"
      WHERE "element_id" IN (
        SELECT "id" FROM "interface_elements"
        WHERE "interface_name" = 'reports' AND "element_id" = 'action-export'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "interface_elements"
      WHERE "interface_name" = 'reports' AND "element_id" = 'action-export'
    `);

    // Rollback POC-323
    await queryRunner.query(`
      DELETE FROM "role_interface_elements"
      WHERE "element_id" IN (
        SELECT "id" FROM "interface_elements"
        WHERE "interface_name" = 'vsc-reports' AND "element_id" = 'action-validate'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "interface_elements"
      WHERE "interface_name" = 'vsc-reports' AND "element_id" = 'action-validate'
    `);

    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      DROP CONSTRAINT IF EXISTS "FK_vsc_reports_validated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "vsc_reports"
      DROP COLUMN IF EXISTS "validated_by",
      DROP COLUMN IF EXISTS "validated_at"
    `);

    // Rollback POC-300: restaurer permissions originales
    await queryRunner.query(`
      DELETE FROM "role_interface_elements"
      WHERE "element_id" IN (
        SELECT "id" FROM "interface_elements"
        WHERE "interface_name" = 'reports' AND "element_id" = 'action-validate'
      )
      AND "role_id" IN (
        SELECT "id" FROM "roles" WHERE "code" = 'volunteer'
      )
    `);

    await queryRunner.query(`
      INSERT INTO "role_interface_elements"
        ("id", "company_id", "role_id", "element_id", "visible", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        r.company_id,
        r.id,
        ie.id,
        true,
        now(),
        now()
      FROM "roles" r, "interface_elements" ie
      WHERE r.code = 'coordinator'
        AND ie.interface_name = 'reports'
        AND ie.element_id = 'action-validate'
        AND NOT EXISTS (
          SELECT 1 FROM "role_interface_elements" rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
    `);
  }
}
