#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedFixVolunteerProfessorActions } from './seed-fix-volunteer-professor-actions';

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedFixVolunteerProfessorActions(seederDataSource);

    console.log('\n🎉 FIX URGENT TERMINÉ');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FIX ÉCHOUÉ:', error);
    process.exit(1);
  }
})();
