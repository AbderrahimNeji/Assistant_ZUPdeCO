import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Populates visibility_scope on role_interface_elements for all sidebar menu items.
 *
 * Scope matrix (derived from the existing hardcoded role logic in services):
 *
 * admin       → unrestricted for all menus
 * manager     → same_establishment for sessions/reports/vsc-reports
 *               same_establishment_or_managed_by for menu-admins
 *               same_establishment for users/establishments
 * coordinator → same_establishment for data menus; unrestricted for config menus
 * tutor       → assignment for sessions/reports/students
 * volunteer   → same_establishment for sessions/students; assignment for reports/vsc-reports
 * student     → assignment for sessions
 */
export class SeedSidebarMenuVisibilityScopes1777000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper: UPDATE role_interface_elements for a given (role code, element_id) pair.
    // Works per company (joins roles + interface_elements on company_id).
    const setScope = async (
      roleCode: string,
      elementId: string,
      scope: Record<string, unknown>,
    ): Promise<void> => {
      await queryRunner.query(
        `
        UPDATE role_interface_elements rie
        SET visibility_scope = $1::jsonb
        FROM roles r, interface_elements ie
        WHERE rie.role_id = r.id
          AND rie.element_id = ie.id
          AND rie.company_id = r.company_id
          AND rie.company_id = ie.company_id
          AND LOWER(r.code) = LOWER($2)
          AND ie.element_id = $3
          AND ie.interface_name = 'sidebar'
          AND ie.element_type = 'menu'
          AND ie.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND rie.visibility_scope IS NULL
        `,
        [JSON.stringify(scope), roleCode, elementId],
      );
    };

    const UNRESTRICTED = { scope: 'unrestricted' };
    const SAME_ESTABLISHMENT = { scope: 'same_establishment', relations: ['establishment'] };
    const ASSIGNMENT = { scope: 'assignment', relations: ['assignment'] };
    const SAME_EST_OR_MANAGED_BY = {
      scope: 'same_establishment_or_managed_by',
      relations: ['establishment', 'managedBy'],
      operator: 'OR',
    };

    // ── ADMIN ─────────────────────────────────────────────────────────────────
    // Admin sees everything without restriction.
    const allMenus = [
      'menu-sessions', 'menu-reports', 'menu-vsc-reports',
      'menu-students', 'menu-tutors', 'menu-volunteers', 'menu-admins',
      'menu-establishments', 'menu-matching',
      'menu-activities', 'menu-activity-types', 'menu-programs',
      'menu-subjects', 'menu-levels', 'menu-holidays', 'menu-school-years',
      'menu-calendar', 'menu-gamification-leaderboard',
    ];
    for (const menu of allMenus) {
      await setScope('admin', menu, UNRESTRICTED);
    }

    // ── MANAGER ───────────────────────────────────────────────────────────────
    await setScope('manager', 'menu-sessions', { scope: 'same_establishment' });
    await setScope('manager', 'menu-reports', { scope: 'same_establishment' });
    await setScope('manager', 'menu-vsc-reports', { scope: 'same_establishment' });
    // Manager sees admins in their establishments OR those they manage.
    await setScope('manager', 'menu-admins', SAME_EST_OR_MANAGED_BY);
    // Manager sees users and establishments in their scope.
    await setScope('manager', 'menu-students', SAME_ESTABLISHMENT);
    await setScope('manager', 'menu-tutors', SAME_ESTABLISHMENT);
    await setScope('manager', 'menu-volunteers', SAME_ESTABLISHMENT);
    await setScope('manager', 'menu-establishments', SAME_ESTABLISHMENT);
    await setScope('manager', 'menu-matching', SAME_ESTABLISHMENT);
    // Configuration menus: unrestricted for manager.
    await setScope('manager', 'menu-activities', UNRESTRICTED);
    await setScope('manager', 'menu-activity-types', UNRESTRICTED);
    await setScope('manager', 'menu-programs', UNRESTRICTED);
    await setScope('manager', 'menu-subjects', UNRESTRICTED);
    await setScope('manager', 'menu-levels', UNRESTRICTED);
    await setScope('manager', 'menu-holidays', UNRESTRICTED);
    await setScope('manager', 'menu-school-years', UNRESTRICTED);
    await setScope('manager', 'menu-calendar', UNRESTRICTED);
    await setScope('manager', 'menu-gamification-leaderboard', UNRESTRICTED);

    // ── COORDINATOR ───────────────────────────────────────────────────────────
    // Coordinator sees data filtered by their establishments.
    // Note: menu-admins already has a visibility_scope → skipped (WHERE IS NULL).
    await setScope('coordinator', 'menu-sessions', SAME_ESTABLISHMENT);
    await setScope('coordinator', 'menu-reports', SAME_ESTABLISHMENT);
    await setScope('coordinator', 'menu-vsc-reports', SAME_ESTABLISHMENT);
    await setScope('coordinator', 'menu-students', SAME_ESTABLISHMENT);
    await setScope('coordinator', 'menu-tutors', SAME_ESTABLISHMENT);
    await setScope('coordinator', 'menu-volunteers', SAME_ESTABLISHMENT);
    await setScope('coordinator', 'menu-establishments', SAME_ESTABLISHMENT);
    await setScope('coordinator', 'menu-matching', SAME_ESTABLISHMENT);
    // Configuration menus: unrestricted for coordinator.
    await setScope('coordinator', 'menu-activities', UNRESTRICTED);
    await setScope('coordinator', 'menu-activity-types', UNRESTRICTED);
    await setScope('coordinator', 'menu-programs', UNRESTRICTED);
    await setScope('coordinator', 'menu-subjects', UNRESTRICTED);
    await setScope('coordinator', 'menu-levels', UNRESTRICTED);
    await setScope('coordinator', 'menu-holidays', UNRESTRICTED);
    await setScope('coordinator', 'menu-school-years', UNRESTRICTED);
    await setScope('coordinator', 'menu-calendar', UNRESTRICTED);
    await setScope('coordinator', 'menu-gamification-leaderboard', UNRESTRICTED);

    // ── TUTOR ─────────────────────────────────────────────────────────────────
    // Tutor only sees data linked to their sessions (assignment scope).
    await setScope('tutor', 'menu-sessions', ASSIGNMENT);
    await setScope('tutor', 'menu-reports', ASSIGNMENT);
    await setScope('tutor', 'menu-students', ASSIGNMENT);
    await setScope('tutor', 'menu-calendar', UNRESTRICTED);
    await setScope('tutor', 'menu-gamification-leaderboard', UNRESTRICTED);

    // ── VOLUNTEER ─────────────────────────────────────────────────────────────
    // Volunteer sees sessions/students in their establishments;
    // their own VSC reports and CR reports via assignment.
    await setScope('volunteer', 'menu-sessions', SAME_ESTABLISHMENT);
    await setScope('volunteer', 'menu-reports', ASSIGNMENT);
    await setScope('volunteer', 'menu-vsc-reports', ASSIGNMENT);
    await setScope('volunteer', 'menu-students', SAME_ESTABLISHMENT);
    await setScope('volunteer', 'menu-tutors', SAME_ESTABLISHMENT);
    await setScope('volunteer', 'menu-calendar', UNRESTRICTED);
    await setScope('volunteer', 'menu-gamification-leaderboard', UNRESTRICTED);
    await setScope('volunteer', 'menu-matching', SAME_ESTABLISHMENT);

    // ── STUDENT ───────────────────────────────────────────────────────────────
    // Student sees only their own sessions.
    await setScope('student', 'menu-sessions', ASSIGNMENT);
    await setScope('student', 'menu-calendar', UNRESTRICTED);
    await setScope('student', 'menu-gamification-leaderboard', UNRESTRICTED);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: clear visibility_scope on all sidebar menu role_interface_elements.
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visibility_scope = NULL
      FROM interface_elements ie
      WHERE rie.element_id = ie.id
        AND ie.interface_name = 'sidebar'
        AND ie.element_type = 'menu'
        AND ie.deleted_at IS NULL
      `,
    );
  }
}
