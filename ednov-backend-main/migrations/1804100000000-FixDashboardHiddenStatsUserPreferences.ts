import { MigrationInterface, QueryRunner } from 'typeorm';

const HIDE_ELEMENT_IDS = ['stat-dropouts-online', 'stat-students-online'];

const REMOVE_ELEMENT_IDS = ['stat-civicservice-inperson', 'stat-civicservice-remote'];

/**
 * Users who saved dashboard layout before role hide still have visible:true in
 * user_interface_preferences — patch JSON so re-show later is explicit, and drop
 * deleted VSC split cards from saved layouts.
 *
 * Effective visibility is also enforced in InterfaceElementsService (role false wins).
 */
export class FixDashboardHiddenStatsUserPreferences1804100000000 implements MigrationInterface {
  name = 'FixDashboardHiddenStatsUserPreferences1804100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
                  WHEN e->>'id' = ANY($1::text[])
                    THEN jsonb_set(e, '{visible}', 'false'::jsonb, true)
                  ELSE e
                END
                ORDER BY ord
              )
              FROM jsonb_array_elements(uip.interface_configs->'dashboard'->'elements')
                WITH ORDINALITY AS t(e, ord)
              WHERE NOT (e->>'id' = ANY($2::text[]))
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
          WHERE e->>'id' = ANY($1::text[])
             OR e->>'id' = ANY($2::text[])
        )
      `,
      [HIDE_ELEMENT_IDS, REMOVE_ELEMENT_IDS],
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // User-specific layout snapshots are not restored.
  }
}
