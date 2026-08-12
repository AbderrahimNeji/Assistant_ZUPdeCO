import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedFixIsSystemRoles } from './seed-fix-is-system-roles';

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedFixIsSystemRoles(seederDataSource);

    console.log('\n🎉 Seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeder failed:', error);
    process.exit(1);
  }
})();
