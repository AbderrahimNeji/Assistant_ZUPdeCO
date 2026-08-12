import { MigrationInterface, QueryRunner } from 'typeorm';

const DASHBOARD = 'dashboard';
const STAT_CARD = 'stat_card';

const HIDE_STAT_IDS = ['stat-dropouts-online', 'stat-students-online'];

const DELETE_STAT_IDS = ['stat-civicservice-inperson', 'stat-civicservice-remote'];

const DELETE_STAT_LABELS = ['VSC en établissement', 'VSC à distance'];

const STUDENTS_ONLINE_CONFIG = JSON.stringify({
  icon: 'Monitor',
  tooltip:
    'Élèves distincts ayant participé à au moins une séance à distance (remote ; hors hybrid).',
});

/**
 * - Insert stat-students-online (Élèves en ligne) per company, hidden for all roles.
 * - Hide stat-dropouts-online and stat-students-online (visible = false, all roles).
 * - Soft-delete VSC split cards (en établissement / à distance) by element_id or label.
 */
export class DashboardHideOnlineStatsAndRemoveVscSplitCards1804000000000
  implements MigrationInterface
{
  name = 'DashboardHideOnlineStatsAndRemoveVscSplitCards1804000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
        'stat-students-online',
        '${STAT_CARD}',
        'Élèves en ligne',
        $1::jsonb,
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
          AND ie.element_id = 'stat-students-online'
          AND ie.interface_name = '${DASHBOARD}'
          AND ie.deleted_at IS NULL
      )
      `,
      [STUDENTS_ONLINE_CONFIG],
    );

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
        false,
        NULL
      FROM interface_elements ie
      INNER JOIN roles r ON r.company_id = ie.company_id AND r.deleted_at IS NULL
      WHERE ie.element_id = 'stat-students-online'
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
    );

    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visible = false, updated_at = NOW()
      FROM interface_elements ie
      WHERE rie.element_id = ie.id
        AND rie.company_id = ie.company_id
        AND ie.interface_name = '${DASHBOARD}'
        AND ie.element_type = '${STAT_CARD}'
        AND ie.deleted_at IS NULL
        AND (
          ie.element_id = ANY($1::text[])
          OR ie.element_label = 'Élèves en ligne'
        )
      `,
      [HIDE_STAT_IDS],
    );

    for (const elementId of DELETE_STAT_IDS) {
      await queryRunner.query(
        `
        DELETE FROM role_interface_elements rie
        USING interface_elements ie
        WHERE rie.element_id = ie.id
          AND ie.element_id = $1::varchar
          AND ie.interface_name = '${DASHBOARD}'
        `,
        [elementId],
      );

      await queryRunner.query(
        `
        UPDATE interface_elements
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE element_id = $1::varchar
          AND interface_name = '${DASHBOARD}'
          AND deleted_at IS NULL
        `,
        [elementId],
      );
    }

    for (const label of DELETE_STAT_LABELS) {
      await queryRunner.query(
        `
        DELETE FROM role_interface_elements rie
        USING interface_elements ie
        WHERE rie.element_id = ie.id
          AND ie.element_label = $1::varchar
          AND ie.interface_name = '${DASHBOARD}'
          AND ie.deleted_at IS NULL
        `,
        [label],
      );

      await queryRunner.query(
        `
        UPDATE interface_elements
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE element_label = $1::varchar
          AND interface_name = '${DASHBOARD}'
          AND deleted_at IS NULL
        `,
        [label],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visible = true, updated_at = NOW()
      FROM interface_elements ie
      WHERE rie.element_id = ie.id
        AND rie.company_id = ie.company_id
        AND ie.interface_name = '${DASHBOARD}'
        AND ie.element_type = '${STAT_CARD}'
        AND ie.deleted_at IS NULL
        AND (
          ie.element_id = ANY($1::text[])
          OR ie.element_label = 'Élèves en ligne'
        )
      `,
      [HIDE_STAT_IDS],
    );

    for (const elementId of DELETE_STAT_IDS) {
      await queryRunner.query(
        `
        UPDATE interface_elements
        SET deleted_at = NULL, updated_at = NOW()
        WHERE element_id = $1::varchar
          AND interface_name = '${DASHBOARD}'
          AND deleted_at IS NOT NULL
        `,
        [elementId],
      );
    }

    for (const label of DELETE_STAT_LABELS) {
      await queryRunner.query(
        `
        UPDATE interface_elements
        SET deleted_at = NULL, updated_at = NOW()
        WHERE element_label = $1::varchar
          AND interface_name = '${DASHBOARD}'
          AND deleted_at IS NOT NULL
        `,
        [label],
      );
    }
  }
}
