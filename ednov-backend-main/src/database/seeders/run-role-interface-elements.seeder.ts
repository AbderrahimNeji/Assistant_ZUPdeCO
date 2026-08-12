import { seederDataSource } from './seeder-datasource';
import { seedRoleInterfaceElements } from './role-interface-elements.seeder';

async function main() {
  try {
    await seederDataSource.initialize();
    await seedRoleInterfaceElements(seederDataSource);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
