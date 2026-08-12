import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedFixRoleGroupOrphan } from './seed-fix-role-group-orphan';

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedFixRoleGroupOrphan(seederDataSource);

    console.log('\n🎉 Seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeder failed:', error);
    process.exit(1);
  }
})();
