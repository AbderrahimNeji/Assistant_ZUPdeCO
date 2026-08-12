import { seederDataSource } from './seeder-datasource';
import { seedEngagementDatesFromNulls } from './engagement-dates-nulls.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await seedEngagementDatesFromNulls(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
