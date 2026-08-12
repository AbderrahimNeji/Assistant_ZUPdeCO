#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRecruiter } from './seed-recruiter';

/**
 * Runner pour le seeder du rôle RECRUTEUR
 *
 * Usage:
 *   npm.cmd run seed:recruiter
 *   npm.cmd run seed:recruiter -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedRecruiter(seederDataSource);

    console.log('\n🎉 RECRUTEUR role seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RECRUTEUR role seeder failed:', error);
    process.exit(1);
  }
})();
