import { seederDataSource } from './seeder-datasource';
import { seedSpecialtiesRolesVisibility } from './specialties-roles-visibility.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await seedSpecialtiesRolesVisibility(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
