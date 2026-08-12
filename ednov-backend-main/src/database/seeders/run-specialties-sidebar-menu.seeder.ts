import { seederDataSource } from './seeder-datasource';
import { seedSpecialtiesSidebarMenu } from './specialties-sidebar-menu.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await seedSpecialtiesSidebarMenu(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
