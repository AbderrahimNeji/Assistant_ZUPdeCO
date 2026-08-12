import { MigrationInterface, QueryRunner } from 'typeorm';

const DASHBOARD_STAT_NEW_STUDENTS = 'stat-students-new';
const HIDE_ROLES = ['manager', 'coordinator', 'volunteer'];

/**
 * Hides the "Nouveaux élèves" stat card for manager, coordinator, and VSC (volunteer)
 * by setting role_interface_elements.visible = false. Null was treated as visible
 * in InterfaceElementsService (visible ?? true).
 */
export class HideNewStudentsKpiManagerCoordinatorVsc1803200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visible = false
      FROM roles r, interface_elements ie
      WHERE rie.role_id = r.id
        AND rie.element_id = ie.id
        AND rie.company_id = r.company_id
        AND rie.company_id = ie.company_id
        AND LOWER(TRIM(r.code)) = ANY($1::text[])
        AND ie.element_id = $2
        AND ie.interface_name = 'dashboard'
        AND ie.element_type = 'stat_card'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [HIDE_ROLES, DASHBOARD_STAT_NEW_STUDENTS],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visible = NULL
      FROM roles r, interface_elements ie
      WHERE rie.role_id = r.id
        AND rie.element_id = ie.id
        AND rie.company_id = r.company_id
        AND rie.company_id = ie.company_id
        AND LOWER(TRIM(r.code)) = ANY($1::text[])
        AND ie.element_id = $2
        AND ie.interface_name = 'dashboard'
        AND ie.element_type = 'stat_card'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [HIDE_ROLES, DASHBOARD_STAT_NEW_STUDENTS],
    );
  }
}
