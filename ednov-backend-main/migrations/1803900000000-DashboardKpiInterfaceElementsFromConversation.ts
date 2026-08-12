import { MigrationInterface, QueryRunner } from 'typeorm';

const DASHBOARD = 'dashboard';
const STAT_CARD = 'stat_card';

const NEW_STAT_CARDS = [
  {
    elementId: 'stat-students-lycee',
    label: 'Élèves au lycée',
    config: {
      icon: 'School',
      tooltip: 'Total des élèves au lycée général et professionnel.',
    },
    /** Hide for tutor and student; visible for all other roles (incl. recruiter, volunteer). */
    visibility: 'hide_tutor_student' as const,
  },
  {
    elementId: 'stat-civicservice-avg-contract',
    label: 'Durée moyenne de contrat VSC',
    config: {
      icon: 'CalendarRange',
      tooltip:
        'Moyenne (fin − début) / nombre de VSC actifs (hors professeurs), en mois.',
    },
    visibility: 'all' as const,
  },
  {
    elementId: 'stat-volunteers-dropouts',
    label: 'Abandons bénévoles',
    config: {
      icon: 'UserMinus',
      tooltip: "Tuteurs désactivés avant leur date de fin d'engagement.",
    },
    visibility: 'all' as const,
  },
] as const;

const REMOVED_ELEMENT_ID = 'stat-volunteers-total';
const RENAMED_ELEMENT_ID = 'stat-tutors-active';

/**
 * Dashboard KPI interface_elements + role_interface_elements from conversation:
 * - Insert stat-students-lycee, stat-civicservice-avg-contract, stat-volunteers-dropouts
 * - Rename stat-tutors-active → « Nombre de bénévoles »
 * - Soft-delete duplicate stat-volunteers-total
 *
 * Idempotent per company (derived from existing dashboard interface_elements).
 * Supersedes manual scripts in ednov-backend/sql/add-vsc-avg-contract-kpi.sql and
 * rename-tutors-active-and-delete-volunteers-total.sql.
 */
export class DashboardKpiInterfaceElementsFromConversation1803900000000
  implements MigrationInterface
{
  name = 'DashboardKpiInterfaceElementsFromConversation1803900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const card of NEW_STAT_CARDS) {
      await this.insertStatCard(queryRunner, card);
    }

    await queryRunner.query(
      `
      UPDATE interface_elements
      SET
        element_label = 'Nombre de bénévoles',
        config = jsonb_set(
          COALESCE(config, '{}'::jsonb),
          '{tooltip}',
          '"Nombre de tuteurs bénévoles actifs (rôle tuteur, statut actif)."'
        ),
        updated_at = NOW()
      WHERE element_id = $1::varchar
        AND interface_name = '${DASHBOARD}'
        AND deleted_at IS NULL
      `,
      [RENAMED_ELEMENT_ID],
    );

    await queryRunner.query(
      `
      DELETE FROM role_interface_elements rie
      USING interface_elements ie
      WHERE rie.element_id = ie.id
        AND ie.element_id = $1::varchar
        AND ie.interface_name = '${DASHBOARD}'
      `,
      [REMOVED_ELEMENT_ID],
    );

    await queryRunner.query(
      `
      UPDATE interface_elements
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE element_id = $1::varchar
        AND interface_name = '${DASHBOARD}'
        AND deleted_at IS NULL
      `,
      [REMOVED_ELEMENT_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const card of NEW_STAT_CARDS) {
      await queryRunner.query(
        `
        DELETE FROM role_interface_elements rie
        USING interface_elements ie
        WHERE rie.element_id = ie.id
          AND ie.element_id = $1::varchar
          AND ie.interface_name = '${DASHBOARD}'
        `,
        [card.elementId],
      );

      await queryRunner.query(
        `
        UPDATE interface_elements
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE element_id = $1::varchar
          AND interface_name = '${DASHBOARD}'
          AND deleted_at IS NULL
        `,
        [card.elementId],
      );
    }

    await queryRunner.query(
      `
      UPDATE interface_elements
      SET
        element_label = 'Tuteurs actifs',
        config = config - 'tooltip',
        updated_at = NOW()
      WHERE element_id = $1::varchar
        AND interface_name = '${DASHBOARD}'
        AND deleted_at IS NULL
      `,
      [RENAMED_ELEMENT_ID],
    );

    await queryRunner.query(
      `
      UPDATE interface_elements
      SET deleted_at = NULL, updated_at = NOW()
      WHERE element_id = $1::varchar
        AND interface_name = '${DASHBOARD}'
        AND deleted_at IS NOT NULL
      `,
      [REMOVED_ELEMENT_ID],
    );
    // role_interface_elements for stat-volunteers-total are not restored automatically.
  }

  private async insertStatCard(
    queryRunner: QueryRunner,
    card: (typeof NEW_STAT_CARDS)[number],
  ): Promise<void> {
    const configJson = JSON.stringify(card.config);

    await queryRunner.query(
      `
      INSERT INTO interface_elements (
        id, company_id, interface_name, element_id, element_type, element_label,
        config, created_at, updated_at, deleted_at,
        group_label, group_icon, group_order,
        parent_id, entity_sub_key, entity_filter, mode
      )
      SELECT
        gen_random_uuid(),
        c.company_id,
        '${DASHBOARD}',
        $1::varchar,
        '${STAT_CARD}',
        $2::varchar,
        $3::jsonb,
        NOW(), NOW(), NULL,
        NULL, NULL, 0,
        NULL, NULL, NULL, NULL
      FROM (
        SELECT DISTINCT company_id
        FROM interface_elements
        WHERE interface_name = '${DASHBOARD}'
          AND deleted_at IS NULL
      ) c
      WHERE NOT EXISTS (
        SELECT 1
        FROM interface_elements ie
        WHERE ie.company_id = c.company_id
          AND ie.element_id = $1::varchar
          AND ie.interface_name = '${DASHBOARD}'
          AND ie.deleted_at IS NULL
      )
      `,
      [card.elementId, card.label, configJson],
    );

    const visibleExpr =
      card.visibility === 'hide_tutor_student'
        ? `CASE WHEN LOWER(TRIM(r.code)) IN ('tutor', 'student') THEN false ELSE true END`
        : 'true';

    await queryRunner.query(
      `
      INSERT INTO role_interface_elements (
        id, company_id, role_id, element_id,
        created_at, updated_at, visibility_scope, "order", visible, width
      )
      SELECT
        gen_random_uuid(),
        ie.company_id,
        r.id,
        ie.id,
        NOW(), NOW(), NULL, NULL,
        ${visibleExpr},
        NULL
      FROM interface_elements ie
      INNER JOIN roles r ON r.company_id = ie.company_id AND r.deleted_at IS NULL
      WHERE ie.element_id = $1::varchar
        AND ie.interface_name = '${DASHBOARD}'
        AND ie.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM role_interface_elements rie
          WHERE rie.role_id = r.id
            AND rie.element_id = ie.id
            AND rie.company_id = ie.company_id
        )
      `,
      [card.elementId],
    );
  }
}
