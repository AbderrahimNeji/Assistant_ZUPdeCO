import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration POC-275
 * 
 * POC-275: Ajouter filtre recherche par nom VSC dans l'interface vsc-reports
 * - Créer l'IE filter-search pour vsc-reports
 * - Donner accès à tous les rôles actifs (admin, coordinator, manager, student, tutor, volunteer)
 */
export class AddFilterSearchToVscReports1776710000000 implements MigrationInterface {
  name = 'AddFilterSearchToVscReports1776710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // POC-275: Nouvel IE filter-search pour vsc-reports
    // ========================================
    await queryRunner.query(`
      -- Créer l'IE filter-search pour vsc-reports
      INSERT INTO "interface_elements"
        ("id", "company_id", "interface_name", "element_id", "element_type", "element_label", "config", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        c.id,
        'vsc-reports',
        'filter-search',
        'filter',
        'Recherche nom VSC',
        '{}',
        now(),
        now()
      FROM "companies" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "interface_elements" ie
        WHERE ie.company_id = c.id
          AND ie.interface_name = 'vsc-reports'
          AND ie.element_id = 'filter-search'
      )
    `);

    await queryRunner.query(`
      -- Donner accès à tous les rôles actifs pour vsc-reports.filter-search avec order=5
      INSERT INTO "role_interface_elements"
        ("id", "company_id", "role_id", "element_id", "visible", "order", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        r.company_id,
        r.id,
        ie.id,
        true,
        5,
        now(),
        now()
      FROM "roles" r, "interface_elements" ie
      WHERE r.code IN ('admin', 'coordinator', 'manager', 'student', 'tutor', 'volunteer')
        AND ie.interface_name = 'vsc-reports'
        AND ie.element_id = 'filter-search'
        AND NOT EXISTS (
          SELECT 1 FROM "role_interface_elements" rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback POC-275: Supprimer les bindings puis l'IE
    await queryRunner.query(`
      DELETE FROM "role_interface_elements"
      WHERE "element_id" IN (
        SELECT "id" FROM "interface_elements"
        WHERE "interface_name" = 'vsc-reports' AND "element_id" = 'filter-search'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "interface_elements"
      WHERE "interface_name" = 'vsc-reports' AND "element_id" = 'filter-search'
    `);
  }
}
