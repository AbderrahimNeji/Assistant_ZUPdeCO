import { config } from 'dotenv';
import { join } from 'path';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

/**
 * Fix quarterly deadlines with correct end-of-quarter dates.
 * T1=Nov30, T2=Feb28/29, T3=May31, T4=Jul31
 * Also removes spurious quarter instances for templates that changed recurrence type.
 */
async function run(label: string) {
  console.log(`\n=== ${label} ===`);
  await seederDataSource.initialize();

  try {
    // Step 1: For each period key, soft-delete rows with wrong deadline when
    // a correct deadline row already exists for the same user+key
    const deduped = await seederDataSource.query(`
      WITH correct_deadlines AS (
        SELECT
          pi.id,
          pi.created_by_id,
          pi.default_post_it_key,
          pi.deadline,
          CASE
            WHEN pi.default_post_it_key ~ '_q[0-9]+_t1$'
              THEN MAKE_DATE(CAST(SUBSTRING(pi.default_post_it_key FROM '_q([0-9]+)_t1$') AS int), 11, 30)::date
            WHEN pi.default_post_it_key ~ '_q[0-9]+_t2$'
              THEN (MAKE_DATE(CAST(SUBSTRING(pi.default_post_it_key FROM '_q([0-9]+)_t2$') AS int) + 1, 3, 1) - INTERVAL '1 day')::date
            WHEN pi.default_post_it_key ~ '_q[0-9]+_t3$'
              THEN (MAKE_DATE(CAST(SUBSTRING(pi.default_post_it_key FROM '_q([0-9]+)_t3$') AS int) + 1, 6, 1) - INTERVAL '1 day')::date
            WHEN pi.default_post_it_key ~ '_q[0-9]+_t4$'
              THEN (MAKE_DATE(CAST(SUBSTRING(pi.default_post_it_key FROM '_q([0-9]+)_t4$') AS int) + 1, 8, 1) - INTERVAL '1 day')::date
          END AS correct_date
        FROM post_its pi
        WHERE pi.is_default = true AND pi.deleted_at IS NULL
          AND pi.default_post_it_key ~ '_q[0-9]+_t[1-4]$'
      ),
      has_correct AS (
        SELECT c.id
        FROM correct_deadlines c
        WHERE c.deadline::date != c.correct_date
          AND EXISTS (
            SELECT 1 FROM correct_deadlines c2
            WHERE c2.created_by_id = c.created_by_id
              AND c2.default_post_it_key = c.default_post_it_key
              AND c2.deadline::date = c2.correct_date
              AND c2.id != c.id
          )
      )
      UPDATE post_its SET deleted_at = now(), updated_at = now()
      WHERE id IN (SELECT id FROM has_correct)
      RETURNING id
    `);
    console.log(`   Deduped (soft-deleted wrong-deadline duplicates): ${deduped.length}`);

    // Step 2: Bulk-update remaining wrong deadlines to correct values
    const fixed = await seederDataSource.query(`
      UPDATE post_its SET
        deadline = CASE
          WHEN default_post_it_key ~ '_q[0-9]+_t1$'
            THEN MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t1$') AS int), 11, 30)::date + TIME '23:59:59'
          WHEN default_post_it_key ~ '_q[0-9]+_t2$'
            THEN (MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t2$') AS int) + 1, 3, 1) - INTERVAL '1 day')::date + TIME '23:59:59'
          WHEN default_post_it_key ~ '_q[0-9]+_t3$'
            THEN (MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t3$') AS int) + 1, 6, 1) - INTERVAL '1 day')::date + TIME '23:59:59'
          WHEN default_post_it_key ~ '_q[0-9]+_t4$'
            THEN (MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t4$') AS int) + 1, 8, 1) - INTERVAL '1 day')::date + TIME '23:59:59'
        END,
        updated_at = now()
      WHERE is_default = true
        AND deleted_at IS NULL
        AND default_post_it_key ~ '_q[0-9]+_t[1-4]$'
        AND deadline::date != CASE
          WHEN default_post_it_key ~ '_q[0-9]+_t1$'
            THEN MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t1$') AS int), 11, 30)::date
          WHEN default_post_it_key ~ '_q[0-9]+_t2$'
            THEN (MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t2$') AS int) + 1, 3, 1) - INTERVAL '1 day')::date
          WHEN default_post_it_key ~ '_q[0-9]+_t3$'
            THEN (MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t3$') AS int) + 1, 6, 1) - INTERVAL '1 day')::date
          WHEN default_post_it_key ~ '_q[0-9]+_t4$'
            THEN (MAKE_DATE(CAST(SUBSTRING(default_post_it_key FROM '_q([0-9]+)_t4$') AS int) + 1, 8, 1) - INTERVAL '1 day')::date
        END
      RETURNING id, default_post_it_key, deadline
    `);
    console.log(`   Fixed deadlines: ${fixed.length}`);

    // Step 3: Soft-delete post-its provisioned with quarterly keys for templates
    // that are now civil_year (their keys shouldn't exist as quarterly anymore)
    // We identify these by: template recurrence_type = 'annually' but key is q{y}_t{n}
    const spurious = await seederDataSource.query(`
      UPDATE post_its pi SET deleted_at = now(), updated_at = now()
      FROM assigned_post_it_templates t
      WHERE pi.is_default = true
        AND pi.deleted_at IS NULL
        AND pi.default_post_it_key LIKE 'assigned_tpl_' || t.id || '_%'
        AND pi.default_post_it_key ~ '_q[0-9]+_t[1-4]$'
        AND t.recurrence_type = 'annually'
        AND t.deleted_at IS NULL
      RETURNING pi.id, pi.default_post_it_key
    `);
    console.log(`   Soft-deleted spurious quarterly keys for annually templates: ${spurious.length}`);

    console.log('✅ Done');
  } catch (err) {
    console.error('💥', err);
    process.exit(1);
  } finally {
    await seederDataSource.destroy();
  }
}

async function main() {
  const envs = [
    { label: 'DEV', args: [] },
    { label: 'TESTING', args: ['--env=TESTING'] },
    { label: 'RECETTE', args: ['--env=RECETTE'] },
    { label: 'REMOTE', args: ['--env=REMOTE'] },
  ];

  for (const env of envs) {
    // Re-set process.argv for seeder-datasource env detection
    process.argv = ['node', 'script', ...env.args];
    await run(env.label);
  }
}

main();
