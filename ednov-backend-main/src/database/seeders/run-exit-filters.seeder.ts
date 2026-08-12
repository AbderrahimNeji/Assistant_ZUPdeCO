import { seederDataSource } from './seeder-datasource';
import { seedExitFilters } from './exit-filters.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await seedExitFilters(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
