import { config } from 'dotenv';
import { join } from 'path';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

async function main() {
  console.log('📦 Connecting to database...');
  await seederDataSource.initialize();

  try {
    const result = await seederDataSource.query(`
      UPDATE assigned_post_it_templates
      SET
        recurrence_type = 'annually',
        quarterly_periods = '{}',
        schedule_config = jsonb_build_object(
          'type', 'civil_year',
          'options', jsonb_build_object('yearScope', 'current_civil_year'),
          'recurrence', jsonb_build_object('mode', 'indefinitely')
        ),
        updated_at = now()
      WHERE target_role_code = 'coordinator'
        AND deleted_at IS NULL
        AND quarterly_periods = ARRAY[1,2,3,4]
      RETURNING title
    `);

    console.log(`✅ Updated ${result.length} transversal templates → civil_year`);
    result.forEach((r: { title: string }) => console.log(`   - ${r.title}`));
  } catch (error) {
    console.error('💥 Failed:', error);
    process.exit(1);
  } finally {
    await seederDataSource.destroy();
    console.log('👋 Done');
  }
}

main();
