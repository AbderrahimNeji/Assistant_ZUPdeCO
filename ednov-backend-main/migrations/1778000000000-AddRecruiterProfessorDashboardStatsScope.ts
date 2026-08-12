import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sets visibility_scope on role_interface_elements for menu-sessions for recruiter and professor.
 *
 * Observed pre-migration state (e.g. Supabase): roles.code may show as `professor`, element_id
 * `menu-sessions`, visibility_scope NULL — then GET /dashboard/stats behaves unrestricted for stats.
 *
 * UPDATE is unconditional (no `visibility_scope IS NULL`): idempotent and fixes NULL rows reliably.
 * Role matching uses LOWER(TRIM(r.code)) so `professor`, `PROFESSOR`, etc. match.
 */
export class AddRecruiterProfessorDashboardStatsScope1778000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
          AND LOWER(TRIM(r.code)) = LOWER(TRIM($2))
          AND ie.element_id = $3
          AND ie.interface_name = 'sidebar'
          AND ie.element_type = 'menu'
          AND ie.deleted_at IS NULL
          AND r.deleted_at IS NULL
        `,
        [JSON.stringify(scope), roleCode, elementId],
      );
    };

    const UNRESTRICTED = { scope: 'unrestricted' };
    const SAME_ESTABLISHMENT = { scope: 'same_establishment', relations: ['establishment'] };

    await setScope('recruiter', 'menu-sessions', UNRESTRICTED);
    await setScope('professor', 'menu-sessions', SAME_ESTABLISHMENT);
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
        AND LOWER(TRIM(r.code)) IN ('recruiter', 'professor')
        AND ie.element_id = 'menu-sessions'
        AND ie.interface_name = 'sidebar'
        AND ie.element_type = 'menu'
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
      `,
    );
  }
}
