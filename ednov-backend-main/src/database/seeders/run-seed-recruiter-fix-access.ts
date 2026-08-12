#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRecruiterFixAccess } from './seed-recruiter-fix-access';

/**
 * Runner pour le seeder: correction accès RECRUTEUR
 *
 * Usage:
 *   npm.cmd run seed:recruiter-fix-access
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedRecruiterFixAccess(seederDataSource);

    console.log('\n🎉 RECRUTEUR fix access seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RECRUTEUR fix access seeder failed:', error);
    process.exit(1);
  }
})();
