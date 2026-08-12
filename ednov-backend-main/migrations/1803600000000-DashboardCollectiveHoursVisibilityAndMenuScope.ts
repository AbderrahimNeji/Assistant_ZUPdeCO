import { MigrationInterface, QueryRunner } from 'typeorm';

const STEERING_STAT_IDS = ['stat-dropouts-inperson', 'stat-dropouts-online', 'stat-hours-collective'];

const MENU_SCOPE = JSON.stringify({
  scope: 'same_establishment',
  relations: ['establishment'],
});

const MENU_SCOPE_ROLE_CODES = ['coordinator', 'volunteer', 'manager', 'professor'];

/**
 * Consolidated migration (formerly 180330 + 180340 + 180350):
 *
 * Dashboard stat card `stat-hours-collective` (interface_elements + role_interface_elements) is
 * seeded from `src/database/seeders/data/interface-elements.json` and
 * `role-interface-elements.json` — run `seed:interface-elements` / role-interface seed where this
 * KPI is required per company (Option D).
 *
 * This migration retains:
 * 1. Hide steering KPIs for `student` and `tutor` on abandons + heures collectives (`visible = false`).
 * 2. Set `visibility_scope` on sidebar menu `menu-sessions` to same_establishment for coordinator,
 *    volunteer (VSC), manager, professor so GET /dashboard/stats uses establishment-bound scope.
 *
 * Data scope note: dashboard stats read scope from the menu binding (`menu-sessions`), not from
 * `stat_card` RIE rows; see VisibilityScopeInterceptor + DashboardController @LinkedElement.
 */
export class DashboardCollectiveHoursVisibilityAndMenuScope1803600000000 implements MigrationInterface {
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
        AND LOWER(TRIM(r.code)) IN ('student', 'tutor')
        AND ie.interface_name = 'dashboard'
        AND ie.element_type = 'stat_card'
        AND ie.element_id = ANY($1::text[])
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [STEERING_STAT_IDS],
    );

    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visibility_scope = $1::jsonb
      FROM roles r, interface_elements ie
      WHERE rie.role_id = r.id
        AND rie.element_id = ie.id
        AND rie.company_id = r.company_id
        AND rie.company_id = ie.company_id
        AND LOWER(TRIM(r.code)) = ANY($2::text[])
        AND ie.element_id = $3
        AND ie.interface_name = 'sidebar'
        AND ie.element_type = 'menu'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [MENU_SCOPE, MENU_SCOPE_ROLE_CODES, 'menu-sessions'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visibility_scope = NULL
      FROM roles r, interface_elements ie
      WHERE rie.role_id = r.id
        AND rie.element_id = ie.id
        AND rie.company_id = r.company_id
        AND rie.company_id = ie.company_id
        AND LOWER(TRIM(r.code)) = ANY($1::text[])
        AND ie.element_id = $2
        AND ie.interface_name = 'sidebar'
        AND ie.element_type = 'menu'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [MENU_SCOPE_ROLE_CODES, 'menu-sessions'],
    );

    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visible = true
      FROM roles r, interface_elements ie
      WHERE rie.role_id = r.id
        AND rie.element_id = ie.id
        AND rie.company_id = r.company_id
        AND rie.company_id = ie.company_id
        AND LOWER(TRIM(r.code)) IN ('student', 'tutor')
        AND ie.interface_name = 'dashboard'
        AND ie.element_type = 'stat_card'
        AND ie.element_id = ANY($1::text[])
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
      [STEERING_STAT_IDS],
    );
  }
}
