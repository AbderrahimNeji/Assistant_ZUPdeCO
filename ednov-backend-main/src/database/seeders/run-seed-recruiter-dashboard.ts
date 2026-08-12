#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRecruiterDashboard } from './seed-recruiter-dashboard';

/**
 * Runner pour le seeder dashboard du rôle RECRUTEUR
 * 
 * Usage:
 *   npm.cmd run seed:recruiter-dashboard
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedRecruiterDashboard(seederDataSource);

    console.log('\n🎉 RECRUTEUR dashboard seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RECRUTEUR dashboard seeder failed:', error);
    process.exit(1);
  }
})();
