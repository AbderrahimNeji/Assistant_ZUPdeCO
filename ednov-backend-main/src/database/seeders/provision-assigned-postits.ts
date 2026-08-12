import { DataSource } from 'typeorm';

/**
 * Provisions all due assigned post-it templates to their target users.
 * Runs isDue() logic for each template and creates post_its instances.
 * This replicates the cron job logic (AssignedPostItsSchedulerService) directly via SQL.
 */
export async function provisionAssignedPostIts(ds: DataSource): Promise<void> {
  console.log('🚀 Provisioning assigned post-its templates to users...');

  // Step 1 — Get all active, undeleted templates
  const templates = await ds.query<Array<{
    id: string;
    company_id: string;
    title: string;
    thematic: string;
    content: string;
    color: string;
    is_priority: boolean;
    recurrence_type: string;
    quarterly_periods: number[] | null;
    target_role_code: string | null;
    target_role_ids: string[] | null;
    target_user_id: string | null;
    last_provisioned_at: Date | null;
    specific_date_from: Date | null;
  }>>(
    `SELECT id, company_id, title, thematic, content, color, is_priority,
            recurrence_type, quarterly_periods, target_role_code, target_role_ids,
            target_user_id, last_provisioned_at, specific_date_from
     FROM assigned_post_it_templates
     WHERE is_active = true AND deleted_at IS NULL`,
  );

  console.log(`   Found ${templates.length} active templates`);

  const now = new Date();
  let totalProvisioned = 0;
  let totalSkipped = 0;

  // T1=Oct1, T2=Jan1, T3=Apr1, T4=Jun1
  const trimesterStarts = [
    new Date(now.getFullYear(), 9, 1),
    new Date(now.getFullYear(), 0, 1),
    new Date(now.getFullYear(), 3, 1),
    new Date(now.getFullYear(), 5, 1),
  ];

  for (const tpl of templates) {
    // isDue check — mirrors AssignedPostItTemplatesService.isDue()
    const last = tpl.last_provisioned_at ? new Date(tpl.last_provisioned_at) : null;
    let due = false;

    switch (tpl.recurrence_type) {
      case 'weekly': {
        const daysSinceLast = last ? (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24) : 999;
        due = !last || daysSinceLast >= 7;
        break;
      }
      case 'monthly': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        due = !last || last < monthStart;
        break;
      }
      case 'quarterly': {
        due = trimesterStarts.some((start) => {
          if (now < start) return false;
          if (!last) return true;
          return last < start && now >= start;
        });
        break;
      }
      case 'school_year': {
        const year = now.getFullYear();
        const schoolYearStart = now >= new Date(year, 9, 1)
          ? new Date(year, 9, 1)
          : new Date(year - 1, 9, 1);
        due = !last || last < schoolYearStart;
        break;
      }
      case 'annually': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        due = !last || last < yearStart;
        break;
      }
      case 'specific_date': {
        if (tpl.specific_date_from && !last && now >= new Date(tpl.specific_date_from)) {
          due = true;
        }
        break;
      }
      default:
        due = false;
    }

    if (!due) {
      totalSkipped++;
      continue;
    }

    // Resolve target users
    let userIds: string[] = [];

    if (tpl.target_user_id) {
      const u = await ds.query<Array<{ id: string }>>(
        `SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [tpl.target_user_id],
      );
      userIds = u.map((r) => r.id);
    } else if (tpl.target_role_ids?.length) {
      const users = await ds.query<Array<{ id: string }>>(
        `SELECT DISTINCT u.id FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         WHERE ur.role_id = ANY($1::uuid[])
           AND u.company_id = $2
           AND u.deleted_at IS NULL`,
        [tpl.target_role_ids, tpl.company_id],
      );
      userIds = users.map((r) => r.id);
    } else if (tpl.target_role_code) {
      const users = await ds.query<Array<{ id: string }>>(
        `SELECT DISTINCT u.id FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
           AND r.code = $1
           AND r.company_id = $2
           AND r.deleted_at IS NULL
         WHERE u.company_id = $2 AND u.deleted_at IS NULL`,
        [tpl.target_role_code, tpl.company_id],
      );
      userIds = users.map((r) => r.id);
    }

    if (!userIds.length) {
      console.log(`   ⚠️  No users found for template "${tpl.title}" — skipping`);
      totalSkipped++;
      continue;
    }

    // Determine periods to provision for quarterly templates
    const periods: (number | null)[] = tpl.recurrence_type === 'quarterly' && tpl.quarterly_periods?.length
      ? tpl.quarterly_periods.filter((p) => {
          // Only provision period if its trimester trigger has passed
          const triggers: Record<number, Date> = {
            1: trimesterStarts[0], // Oct 1
            2: trimesterStarts[1], // Jan 1
            3: trimesterStarts[2], // Apr 1
            4: trimesterStarts[3], // Jun 1
          };
          return triggers[p] && now >= triggers[p];
        })
      : [null];

    let templateProvisioned = 0;

    for (const userId of userIds) {
      for (const period of periods) {
        // Build period key (legacy format: q{year}_t{period} or m/w/y/sd)
        let periodKey: string;
        const year = now.getFullYear();
        if (tpl.recurrence_type === 'quarterly' && period !== null) {
          const schoolYearStart = now >= new Date(year, 9, 1) ? year : year - 1;
          periodKey = `q${schoolYearStart}_t${period}`;
        } else if (tpl.recurrence_type === 'monthly') {
          periodKey = `m${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        } else if (tpl.recurrence_type === 'weekly') {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          periodKey = `w${weekStart.toISOString().slice(0, 10)}`;
        } else if (tpl.recurrence_type === 'school_year') {
          const schoolYearStart = now >= new Date(year, 9, 1) ? year : year - 1;
          periodKey = `y${schoolYearStart}`;
        } else if (tpl.recurrence_type === 'annually') {
          periodKey = `v2_cy${year}`;
        } else if (tpl.recurrence_type === 'specific_date' && tpl.specific_date_from) {
          periodKey = `sd${new Date(tpl.specific_date_from).toISOString().slice(0, 10)}`;
        } else {
          periodKey = `unknown_${now.toISOString().slice(0, 10)}`;
        }

        const defaultPostItKey = `assigned_tpl_${tpl.id}_${periodKey}`;

        // Calculate deadline based on template configuration
        let deadline: Date;
        if (tpl.recurrence_type === 'quarterly' && period !== null) {
          // Deadline = end of quarter
          const quarterEndMonths = { 1: 11, 2: 2, 3: 5, 4: 7 }; // Dec, Mar, Jun, Aug
          const endMonth = quarterEndMonths[period as 1 | 2 | 3 | 4];
          const year = now.getFullYear();
          deadline = new Date(year, endMonth, 0, 23, 59, 59);
        } else if (tpl.recurrence_type === 'annually') {
          // Annually (civil_year) = Dec 31
          deadline = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        } else if (tpl.recurrence_type === 'school_year') {
          // School year = June 30 next year
          deadline = new Date(now.getFullYear() + 1, 5, 30, 23, 59, 59);
        } else if (tpl.recurrence_type === 'monthly') {
          // Monthly = last day of current month
          deadline = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);
        } else if (tpl.recurrence_type === 'weekly') {
          // Weekly = +7 days
          deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (tpl.specific_date_from) {
          deadline = new Date(tpl.specific_date_from);
        } else {
          deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

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
            userId,
            tpl.title,
            tpl.thematic,
            tpl.content,
            tpl.color,
            tpl.is_priority,
            defaultPostItKey,
            deadline,
          ],
        );

        if (inserted.length > 0) {
          templateProvisioned++;
          totalProvisioned++;
        }
      }
    }

    if (templateProvisioned > 0) {
      // Update last_provisioned_at
      await ds.query(
        `UPDATE assigned_post_it_templates SET last_provisioned_at = now(), updated_at = now() WHERE id = $1`,
        [tpl.id],
      );
      console.log(`   ✅ "${tpl.title}" → ${templateProvisioned} post-its created`);
    } else {
      totalSkipped++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Total post-its provisioned: ${totalProvisioned}`);
  console.log(`   ⏭️  Templates skipped (not due or already done): ${totalSkipped}`);
}
