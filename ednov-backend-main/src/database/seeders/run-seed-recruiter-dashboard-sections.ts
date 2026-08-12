#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRecruiterDashboardSections } from './seed-recruiter-dashboard-sections';

/**
 * Runner pour le seeder des sections dashboard du rôle RECRUTEUR
 * 
 * Usage:
 *   npm.cmd run seed:recruiter-dashboard-sections
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedRecruiterDashboardSections(seederDataSource);

    console.log('\n🎉 RECRUTEUR dashboard sections seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RECRUTEUR dashboard sections seeder failed:', error);
    process.exit(1);
  }
})();
