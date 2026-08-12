import { DataSource } from 'typeorm';

/**
 * Provision annually coordinator templates that were stuck due to the insertPostItForUser bug.
 *
 * Background:
 * - All annually (civil_year) coordinator templates have last_provisioned_at set but 0 v2_cy post-its
 * - This was caused by insertPostItForUser returning 1 even when ON CONFLICT DO NOTHING inserted nothing
 * - Some envs also have old quarterly-keyed post-its that were never cleaned up
 * - This seeder: (1) cleans up spurious quarterly keys, (2) resets last_provisioned_at,
 *   (3) provisions the correct v2_cy{year} post-its
 */
export async function provisionAnnuallyCoordinator(ds: DataSource): Promise<void> {
  const currentYear = new Date().getFullYear();
  console.log('🚀 Provisioning annually coordinator templates...');

  // Step 0: Soft-delete spurious quarterly-keyed post-its for annually templates
  const spurious = await ds.query(`
    UPDATE post_its pi SET deleted_at = now(), updated_at = now()
    FROM assigned_post_it_templates t
    WHERE pi.is_default = true
      AND pi.deleted_at IS NULL
      AND pi.default_post_it_key LIKE 'assigned_tpl_' || t.id || '_%'
      AND pi.default_post_it_key ~ '_q[0-9]+_t[1-4]$'
      AND t.recurrence_type = 'annually'
      AND t.target_role_code = 'coordinator'
      AND t.deleted_at IS NULL
    RETURNING pi.id
  `);
  if (spurious.length > 0) {
    console.log(`   Soft-deleted ${spurious.length} spurious quarterly post-its for annually templates`);
  }

  // Step 1: Find annually coordinator templates missing v2_cy{year} post-its
  const templates = await ds.query<Array<{
    id: string;
    title: string;
    company_id: string;
    target_role_ids: string[];
    thematic: string;
    content: string;
    color: string;
    is_priority: boolean;
  }>>(`
    SELECT 
      t.id, t.title, t.company_id, t.target_role_ids,
      t.thematic, t.content, t.color, t.is_priority
    FROM assigned_post_it_templates t
    WHERE t.recurrence_type = 'annually'
      AND t.target_role_code = 'coordinator'
      AND t.deleted_at IS NULL
      AND t.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM post_its pi
        WHERE pi.default_post_it_key LIKE 'assigned_tpl_' || t.id || '_v2_cy' || $1
          AND pi.deleted_at IS NULL
      )
  `, [String(currentYear)]);

  console.log(`   Found ${templates.length} annually coordinator templates with 0 post-its`);

  if (templates.length === 0) {
    console.log('   ✅ No templates to provision');
    return;
  }

  // Step 2: Reset last_provisioned_at for these templates
  const resetIds = templates.map(t => t.id);
  await ds.query(
    `UPDATE assigned_post_it_templates 
     SET last_provisioned_at = NULL, updated_at = now() 
     WHERE id = ANY($1::uuid[])`,
    [resetIds]
  );
  console.log(`   Reset last_provisioned_at for ${templates.length} templates`);

  // Step 3: For each template, provision post-its for all coordinator users
  let totalProvisioned = 0;
  const now = new Date();
  const deadline = new Date(currentYear, 11, 31, 23, 59, 59); // Dec 31, 23:59:59

  for (const tpl of templates) {
    // Get all coordinator users for this company
    const users = await ds.query<Array<{ id: string }>>(
      `SELECT DISTINCT u.id FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       WHERE ur.role_id = ANY($1::uuid[])
         AND u.company_id = $2
         AND u.deleted_at IS NULL`,
      [tpl.target_role_ids, tpl.company_id]
    );

    if (!users.length) {
      console.log(`   ⚠️  No coordinator users found for template "${tpl.title}"`);
      continue;
    }

    const periodKey = `v2_cy${currentYear}`;
    const defaultPostItKey = `assigned_tpl_${tpl.id}_${periodKey}`;

    let provisioned = 0;
    for (const user of users) {
      const inserted = await ds.query(
        `INSERT INTO post_its (
          id, company_id, created_by_id, title, thematic, content,
          color, is_priority, status, is_archived, is_default,
          default_post_it_key, deadline, created_at, updated_at
        )
        SELECT
          gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5,
          $6, $7, 'en_cours', false, true,
          $8::varchar, $9, now(), now()
        WHERE NOT EXISTS (
          SELECT 1 FROM post_its
          WHERE created_by_id = $2 AND default_post_it_key = $8::varchar AND deleted_at IS NULL
        )
        RETURNING id`,
        [
          tpl.company_id,
          user.id,
          tpl.title,
          tpl.thematic,
          tpl.content,
          tpl.color,
          tpl.is_priority,
          defaultPostItKey,
          deadline,
        ]
      );

      if (inserted.length > 0) {
        provisioned++;
        totalProvisioned++;
      }
    }

    // Update last_provisioned_at for this template
    if (provisioned > 0) {
      await ds.query(
        `UPDATE assigned_post_it_templates 
         SET last_provisioned_at = now(), updated_at = now() 
         WHERE id = $1`,
        [tpl.id]
      );
      console.log(`   ✅ "${tpl.title}" → ${provisioned} post-its created`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Total post-its provisioned: ${totalProvisioned}`);
  console.log(`   📋 Templates processed: ${templates.length}`);
}
