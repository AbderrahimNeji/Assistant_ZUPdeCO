#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedAlignProfessorVolunteerAccess } from './seed-align-professor-volunteer-access';

/**
 * Runner pour aligner les accès PROFESSOR sur volunteer
 * 
 * Ce runner fait partie du pipeline complet (run-seed-all-pipeline.ts)
 * 
 * Usage standalone (si besoin) :
 *   npx ts-node --transpile-only src/database/seeders/run-seed-align-professor-volunteer-access.ts
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedAlignProfessorVolunteerAccess(seederDataSource);

    console.log('\n🎉 PROFESSOR ↔ volunteer alignment completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Alignment seeder failed:', error);
    process.exit(1);
  }
})();
