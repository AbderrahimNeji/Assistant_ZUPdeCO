import { seederDataSource } from './seeder-datasource';
import { seedBrandings } from './brandings.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await seedBrandings(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
