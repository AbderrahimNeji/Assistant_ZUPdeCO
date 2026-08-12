import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedProfessorBindings } from './seed-professor-bindings';

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedProfessorBindings(seederDataSource);

    console.log('\n🎉 Seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeder failed:', error);
    process.exit(1);
  }
})();
