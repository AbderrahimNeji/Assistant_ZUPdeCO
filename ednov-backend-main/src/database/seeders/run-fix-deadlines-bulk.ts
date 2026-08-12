import { config } from 'dotenv';
import { join } from 'path';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

/**
 * Fast bulk fix for wrong deadlines on assigned post-its.
 * Uses set-based SQL instead of row-by-row.
 *
 * Strategy:
 * 1. Soft-delete rows that have a wrong deadline AND a correct duplicate already exists
 * 2. Bulk-update remaining rows to correct deadlines by period key pattern
 */
async function main() {
  console.log('📦 Connecting...');
  await seederDataSource.initialize();

  try {
    // Step 1: Soft-delete wrong-deadline duplicates when a correct row exists
    // (unique constraint is on created_by_id + default_post_it_key + deadline)
    const deleted = await seederDataSource.query(`
      WITH wrong_rows AS (
        SELECT pi.id, pi.created_by_id, pi.default_post_it_key
        FROM post_its pi
        WHERE pi.is_default = true
          AND pi.deleted_at IS NULL
          -- Has a sibling row with a different (non-null) deadline
          AND EXISTS (
            SELECT 1 FROM post_its pi2
            WHERE pi2.created_by_id = pi.created_by_id
              AND pi2.default_post_it_key = pi.default_post_it_key
              AND pi2.id != pi.id
              AND pi2.deadline IS NOT NULL
              AND pi2.deleted_at IS NULL
          )
          -- Pick the ones that DON'T have the canonical deadline
          -- (we'll soft-delete these, keeping only the correct-deadline sibling)
          AND pi.deadline NOT IN (
            -- Canonical deadline per period type
            CASE
              WHEN pi.default_post_it_key ~ '_q[0-9]+_t1$' THEN DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(pi.default_post_it_key FROM '_q([0-9]+)_t1$') AS int), 12, 1)) + INTERVAL '1 month - 1 day'
              WHEN pi.default_post_it_key ~ '_q[0-9]+_t2$' THEN DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(pi.default_post_it_key FROM '_q([0-9]+)_t2$') AS int) + 1, 3, 1)) + INTERVAL '1 month - 1 day'
              WHEN pi.default_post_it_key ~ '_q[0-9]+_t3$' THEN DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(pi.default_post_it_key FROM '_q([0-9]+)_t3$') AS int) + 1, 6, 1)) + INTERVAL '1 month - 1 day'
              WHEN pi.default_post_it_key ~ '_q[0-9]+_t4$' THEN DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(pi.default_post_it_key FROM '_q([0-9]+)_t4$') AS int) + 1, 8, 1)) + INTERVAL '1 month - 1 day'
              ELSE NULL
            END
          )
      )
      UPDATE post_its SET deleted_at = now(), updated_at = now()
      WHERE id IN (SELECT id FROM wrong_rows)
      RETURNING id
    `);
    console.log(`   Soft-deleted ${deleted.length} wrong-deadline duplicates`);

    // Step 2: Bulk-update remaining wrong deadlines by pattern

    // T1: end of November (school year start year)
    const t1 = await seederDataSource.query(`
      UPDATE post_its SET
        deadline = (DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t1$') AS int), 12, 1)) + INTERVAL '1 month - 1 day')::date + TIME '23:59:59',
        updated_at = now()
      WHERE is_default = true
        AND deleted_at IS NULL
        AND default_post_it_key ~ '_q[0-9]+_t1$'
        AND (deadline IS NULL OR deadline::date != (DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t1$') AS int), 12, 1)) + INTERVAL '1 month - 1 day')::date)
      RETURNING id
    `);
    console.log(`   T1 updated: ${t1.length}`);

    // T2: end of February (year after school year start)
    const t2 = await seederDataSource.query(`
      UPDATE post_its SET
        deadline = (DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t2$') AS int) + 1, 3, 1)) + INTERVAL '1 month - 1 day')::date + TIME '23:59:59',
        updated_at = now()
      WHERE is_default = true
        AND deleted_at IS NULL
        AND default_post_it_key ~ '_q[0-9]+_t2$'
        AND (deadline IS NULL OR deadline::date != (DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t2$') AS int) + 1, 3, 1)) + INTERVAL '1 month - 1 day')::date)
      RETURNING id
    `);
    console.log(`   T2 updated: ${t2.length}`);

    // T3: end of May (year after school year start)
    const t3 = await seederDataSource.query(`
      UPDATE post_its SET
        deadline = (DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t3$') AS int) + 1, 6, 1)) + INTERVAL '1 month - 1 day')::date + TIME '23:59:59',
        updated_at = now()
      WHERE is_default = true
        AND deleted_at IS NULL
        AND default_post_it_key ~ '_q[0-9]+_t3$'
        AND (deadline IS NULL OR deadline::date != (DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t3$') AS int) + 1, 6, 1)) + INTERVAL '1 month - 1 day')::date)
      RETURNING id
    `);
    console.log(`   T3 updated: ${t3.length}`);

    // T4: end of July (year after school year start)
    const t4 = await seederDataSource.query(`
      UPDATE post_its SET
        deadline = (DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t4$') AS int) + 1, 8, 1)) + INTERVAL '1 month - 1 day')::date + TIME '23:59:59',
        updated_at = now()
      WHERE is_default = true
        AND deleted_at IS NULL
        AND default_post_it_key ~ '_q[0-9]+_t4$'
        AND (deadline IS NULL OR deadline::date != (DATE_TRUNC('month', MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t4$') AS int) + 1, 8, 1)) + INTERVAL '1 month - 1 day')::date)
      RETURNING id
    `);
    console.log(`   T4 updated: ${t4.length}`);

    // Civil year: Dec 31 of the year
    const cy = await seederDataSource.query(`
      UPDATE post_its SET
        deadline = (MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_cy([0-9]+)') AS int), 12, 31))::date + TIME '23:59:59',
        updated_at = now()
      WHERE is_default = true
        AND deleted_at IS NULL
        AND default_post_it_key ~ '_cy[0-9]+'
        AND (deadline IS NULL OR deadline::date != (MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_cy([0-9]+)') AS int), 12, 31))::date)
      RETURNING id
    `);
    console.log(`   Civil year updated: ${cy.length}`);

    console.log('✅ Done');
  } catch (err) {
    console.error('💥', err);
    process.exit(1);
  } finally {
    await seederDataSource.destroy();
  }
}

main();
