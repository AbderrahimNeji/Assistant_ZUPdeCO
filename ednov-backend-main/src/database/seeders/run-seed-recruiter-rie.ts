#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRecruiterRIE } from './seed-recruiter-rie';

/**
 * Runner pour le seeder des RIE du rôle RECRUTEUR
 *
 * Usage:
 *   npm.cmd run seed:recruiter-rie
 *   npm.cmd run seed:recruiter-rie -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedRecruiterRIE(seederDataSource);

    console.log('\n🎉 RECRUTEUR RIE seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RECRUTEUR RIE seeder failed:', error);
    process.exit(1);
  }
})();
