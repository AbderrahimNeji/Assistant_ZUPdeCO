#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRecruiterRemoveCharts } from './seed-recruiter-remove-charts';

/**
 * Runner pour le seeder: retrait accès charts RECRUTEUR
 *
 * Usage:
 *   npm.cmd run seed:recruiter-remove-charts
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedRecruiterRemoveCharts(seederDataSource);

    console.log('\n🎉 RECRUTEUR remove charts seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RECRUTEUR remove charts seeder failed:', error);
    process.exit(1);
  }
})();
