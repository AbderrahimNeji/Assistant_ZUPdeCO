import { MigrationInterface, QueryRunner } from 'typeorm';

const DASHBOARD = 'dashboard';
const SHOW_ELEMENT_ID = 'stat-sessions-hours';

/**
 * Show dashboard KPI stat-sessions-hours (Heures de séances):
 * - visible = true for all roles that already have a binding
 * - align order with stat-sessions-completed (51)
 * - insert recruiter binding where missing
 * - patch user_interface_preferences dashboard.elements visible for this card
 */
export class ShowStatSessionsHoursKpi1804200000000 implements MigrationInterface {
  name = 'ShowStatSessionsHoursKpi1804200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visible = true, updated_at = NOW()
      FROM interface_elements ie
      WHERE rie.element_id = ie.id
        AND rie.company_id = ie.company_id
        AND ie.element_id = $1::varchar
        AND ie.interface_name = '${DASHBOARD}'
        AND ie.deleted_at IS NULL
      `,
      [SHOW_ELEMENT_ID],
    );

    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET "order" = completed_rie."order", updated_at = NOW()
      FROM interface_elements hours_ie,
           interface_elements completed_ie,
           role_interface_elements completed_rie
      WHERE rie.element_id = hours_ie.id
        AND rie.company_id = hours_ie.company_id
        AND hours_ie.element_id = $1::varchar
        AND hours_ie.interface_name = '${DASHBOARD}'
        AND hours_ie.deleted_at IS NULL
        AND completed_ie.company_id = hours_ie.company_id
        AND completed_ie.interface_name = '${DASHBOARD}'
        AND completed_ie.element_id = 'stat-sessions-completed'
        AND completed_ie.deleted_at IS NULL
        AND completed_rie.element_id = completed_ie.id
        AND completed_rie.company_id = completed_ie.company_id
        AND completed_rie.role_id = rie.role_id
      `,
      [SHOW_ELEMENT_ID],
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
        NOW(), NOW(), NULL, 0,
        true,
        NULL
      FROM interface_elements ie
      INNER JOIN roles r ON r.company_id = ie.company_id AND r.deleted_at IS NULL
      WHERE ie.element_id = $1::varchar
        AND ie.interface_name = '${DASHBOARD}'
        AND ie.deleted_at IS NULL
        AND LOWER(TRIM(r.code)) = 'recruiter'
        AND NOT EXISTS (
          SELECT 1
          FROM role_interface_elements rie
          WHERE rie.role_id = r.id
            AND rie.element_id = ie.id
            AND rie.company_id = ie.company_id
        )
      `,
      [SHOW_ELEMENT_ID],
    );

    await queryRunner.query(
      `
      UPDATE user_interface_preferences uip
      SET
        interface_configs = jsonb_set(
          uip.interface_configs,
          '{dashboard,elements}',
          COALESCE(
            (
              SELECT jsonb_agg(
                CASE
                  WHEN e->>'id' = $1::text
                    THEN jsonb_set(e, '{visible}', 'true'::jsonb, true)
                  ELSE e
                END
                ORDER BY ord
              )
              FROM jsonb_array_elements(uip.interface_configs->'dashboard'->'elements')
                WITH ORDINALITY AS t(e, ord)
            ),
            '[]'::jsonb
          ),
          true
        ),
        updated_at = NOW()
      WHERE uip.interface_configs ? 'dashboard'
        AND jsonb_typeof(uip.interface_configs->'dashboard'->'elements') = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(uip.interface_configs->'dashboard'->'elements') e
          WHERE e->>'id' = $1::text
        )
      `,
      [SHOW_ELEMENT_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE role_interface_elements rie
      SET visible = false, updated_at = NOW()
      FROM interface_elements ie
      WHERE rie.element_id = ie.id
        AND rie.company_id = ie.company_id
        AND ie.element_id = $1::varchar
        AND ie.interface_name = '${DASHBOARD}'
        AND ie.deleted_at IS NULL
      `,
      [SHOW_ELEMENT_ID],
    );

    await queryRunner.query(
      `
      DELETE FROM role_interface_elements rie
      USING interface_elements ie, roles r
      WHERE rie.element_id = ie.id
        AND rie.role_id = r.id
        AND ie.element_id = $1::varchar
        AND ie.interface_name = '${DASHBOARD}'
        AND LOWER(TRIM(r.code)) = 'recruiter'
      `,
      [SHOW_ELEMENT_ID],
    );

    await queryRunner.query(
      `
      UPDATE user_interface_preferences uip
      SET
        interface_configs = jsonb_set(
          uip.interface_configs,
          '{dashboard,elements}',
          COALESCE(
            (
              SELECT jsonb_agg(
                CASE
                  WHEN e->>'id' = $1::text
                    THEN jsonb_set(e, '{visible}', 'false'::jsonb, true)
                  ELSE e
                END
                ORDER BY ord
              )
              FROM jsonb_array_elements(uip.interface_configs->'dashboard'->'elements')
                WITH ORDINALITY AS t(e, ord)
            ),
            '[]'::jsonb
          ),
          true
        ),
        updated_at = NOW()
      WHERE uip.interface_configs ? 'dashboard'
        AND jsonb_typeof(uip.interface_configs->'dashboard'->'elements') = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(uip.interface_configs->'dashboard'->'elements') e
          WHERE e->>'id' = $1::text
        )
      `,
      [SHOW_ELEMENT_ID],
    );
  }
}
