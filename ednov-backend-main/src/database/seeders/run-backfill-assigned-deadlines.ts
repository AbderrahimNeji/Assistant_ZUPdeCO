import { config } from 'dotenv';
import { join } from 'path';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

/**
 * Backfills deadline for provisioned assigned post-its that have null deadline.
 * Uses the template's scheduleConfig to calculate the correct deadline.
 */
async function main() {
  console.log('📦 Connecting to database...');
  await seederDataSource.initialize();

  try {
    console.log('🔧 Backfilling deadlines for assigned post-its...');

    // Get all post-its with null deadline that are assigned (is_default=true)
    const postIts = await seederDataSource.query(`
      SELECT
        pi.id,
        pi.default_post_it_key,
        pi.created_at,
        t.schedule_config,
        t.specific_date_from,
        t.recurrence_type
      FROM post_its pi
      LEFT JOIN assigned_post_it_templates t
        ON t.id::text = substring(pi.default_post_it_key from 14 for 36)
      WHERE pi.is_default = true
        AND pi.deleted_at IS NULL
    `);

    console.log(`   Found ${postIts.length} post-its with null deadline`);

    let updated = 0;
    let errors = 0;

    for (const postIt of postIts) {
      try {
        let deadline: Date;

        if (postIt.schedule_config) {
          const config = postIt.schedule_config;
          const createdAt = new Date(postIt.created_at);

          switch (config.type) {
            case 'quarterly': {
              // Deadline = end of quarter(s)
              const quarters = config.options?.targetQuarters || [];
              if (quarters.length > 0) {
                // Use the latest quarter end
                const quarterEndMonths = { 1: 11, 2: 2, 3: 5, 4: 7 }; // Dec, Mar, Jun, Aug
                const latestQuarter = Math.max(...quarters);
                const endMonth = quarterEndMonths[latestQuarter as keyof typeof quarterEndMonths];
                const year = createdAt.getFullYear();
                deadline = new Date(year, endMonth, 0, 23, 59, 59); // Last day of month
              } else {
                deadline = new Date(createdAt.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days
              }
              break;
            }
            case 'civil_year':
            case 'school_year': {
              const year = createdAt.getFullYear();
              deadline = config.type === 'civil_year'
                ? new Date(year, 11, 31, 23, 59, 59) // Dec 31
                : new Date(year + 1, 5, 30, 23, 59, 59); // June 30 next year
              break;
            }
            case 'monthly': {
              const month = createdAt.getMonth();
              const year = createdAt.getFullYear();
              deadline = new Date(year, month + 1, 0, 23, 59, 59); // Last day of month
              break;
            }
            case 'weekly': {
              deadline = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
              break;
            }
            default: {
              deadline = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000); // Default +7 days
            }
          }
        } else if (postIt.specific_date_from) {
          deadline = new Date(postIt.specific_date_from);
        } else {
          deadline = new Date(postIt.created_at);
          deadline.setDate(deadline.getDate() + 7); // Default +7 days
        }

        // Check if a valid (non-null deadline) duplicate already exists
        const existing = await seederDataSource.query(
          `SELECT id FROM post_its WHERE created_by_id = (SELECT created_by_id FROM post_its WHERE id = $1) AND default_post_it_key = (SELECT default_post_it_key FROM post_its WHERE id = $1) AND deadline IS NOT NULL AND deleted_at IS NULL AND id != $1 LIMIT 1`,
          [postIt.id],
        );

        if (existing.length > 0) {
          // A valid version already exists — soft-delete this null-deadline duplicate
          await seederDataSource.query(
            `UPDATE post_its SET deleted_at = now(), updated_at = now() WHERE id = $1`,
            [postIt.id],
          );
          updated++;
        } else {
          await seederDataSource.query(
            `UPDATE post_its SET deadline = $1, updated_at = now() WHERE id = $2`,
            [deadline, postIt.id],
          );
          updated++;
        }
      } catch (error) {
        console.error(`   ⚠️  Error updating post-it ${postIt.id}:`, error);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Errors: ${errors}`);
    console.log('🎉 Backfill completed successfully');
  } catch (error) {
    console.error('💥 Backfill failed:', error);
    process.exit(1);
  } finally {
    await seederDataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
