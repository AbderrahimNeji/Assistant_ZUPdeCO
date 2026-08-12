#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedProfessionalSituationBackfill } from './seed-professional-situation-backfill';

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedProfessionalSituationBackfill(seederDataSource);

    console.log('\n🎉 Seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeder failed:', error);
    process.exit(1);
  }
})();
