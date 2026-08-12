import { seederDataSource } from './seeder-datasource';
import { seedActivityFilters } from './activity-filters.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await seedActivityFilters(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
