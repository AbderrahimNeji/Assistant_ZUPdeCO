import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ajouter le filtre Classe dans l'interface students
 * - Crée l'IE filter-classe pour students
 * - Visible par défaut pour admin, coordinator, manager
 * - Non visible pour PROFESSOR, student, tutor, volunteer
 * - Positionné après filter-etablissement (order=4)
 */
export class AddFilterClasseToStudents1776900000000 implements MigrationInterface {
  name = 'AddFilterClasseToStudents1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Créer l'IE filter-classe pour students
    await queryRunner.query(`
      INSERT INTO "interface_elements"
        ("id", "company_id", "interface_name", "element_id", "element_type", "element_label", "config", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        c.id,
        'students',
        'filter-classe',
        'filter',
        'Classe',
        '{}',
        now(),
        now()
      FROM "companies" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "interface_elements" ie
        WHERE ie.company_id = c.id
          AND ie.interface_name = 'students'
          AND ie.element_id = 'filter-classe'
      )
    `);

    // Donner accès aux rôles admin, coordinator, manager (visible=true)
    await queryRunner.query(`
      INSERT INTO "role_interface_elements"
        ("id", "company_id", "role_id", "element_id", "visible", "order", "width", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        r.company_id,
        r.id,
        ie.id,
        true,
        4,
        'auto',
        now(),
        now()
      FROM "roles" r, "interface_elements" ie
      WHERE r.code IN ('admin', 'coordinator', 'manager')
        AND ie.interface_name = 'students'
        AND ie.element_id = 'filter-classe'
        AND NOT EXISTS (
          SELECT 1 FROM "role_interface_elements" rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
    `);

    // Donner accès aux autres rôles (visible=false)
    await queryRunner.query(`
      INSERT INTO "role_interface_elements"
        ("id", "company_id", "role_id", "element_id", "visible", "order", "width", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        r.company_id,
        r.id,
        ie.id,
        false,
        4,
        'auto',
        now(),
        now()
      FROM "roles" r, "interface_elements" ie
      WHERE r.code IN ('PROFESSOR', 'student', 'tutor', 'volunteer')
        AND ie.interface_name = 'students'
        AND ie.element_id = 'filter-classe'
        AND NOT EXISTS (
          SELECT 1 FROM "role_interface_elements" rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_interface_elements"
      WHERE "element_id" IN (
        SELECT "id" FROM "interface_elements"
        WHERE "interface_name" = 'students' AND "element_id" = 'filter-classe'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "interface_elements"
      WHERE "interface_name" = 'students' AND "element_id" = 'filter-classe'
    `);
  }
}
