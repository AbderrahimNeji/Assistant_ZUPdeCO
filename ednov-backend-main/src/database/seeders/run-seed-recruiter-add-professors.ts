#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRecruiterAddProfessors } from './seed-recruiter-add-professors';

/**
 * Runner pour le seeder: ajout accès professeurs RECRUTEUR
 *
 * Usage:
 *   npm.cmd run seed:recruiter-add-professors
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedRecruiterAddProfessors(seederDataSource);

    console.log('\n🎉 RECRUTEUR add professors seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RECRUTEUR add professors seeder failed:', error);
    process.exit(1);
  }
})();
