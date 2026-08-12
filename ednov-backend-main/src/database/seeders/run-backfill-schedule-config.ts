import { config } from 'dotenv';
import { join } from 'path';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

async function main() {
  console.log('📦 Connecting to database...');
  await seederDataSource.initialize();

  try {
    console.log('🔧 Backfilling schedule_config for coordinator quarterly templates...');

    const result = await seederDataSource.query(`
      UPDATE assigned_post_it_templates
      SET
        schedule_config = jsonb_build_object(
          'type', 'quarterly',
          'options', jsonb_build_object(
            'targetQuarters', to_jsonb(quarterly_periods),
            'yearScope', 'current_school_year'
          ),
          'recurrence', jsonb_build_object('mode', 'indefinitely')
        ),
        updated_at = now()
      WHERE target_role_code = 'coordinator'
        AND deleted_at IS NULL
        AND schedule_config IS NULL
        AND recurrence_type = 'quarterly'
        AND quarterly_periods IS NOT NULL
        AND quarterly_periods != '{}'
      RETURNING id
    `);

    console.log(`✅ Updated ${result.length} templates with schedule_config`);
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
