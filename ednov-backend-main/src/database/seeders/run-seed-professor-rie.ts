#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedProfessorRIE } from './seed-professor-rie';

/**
 * Runner pour le seeder des RIE du rôle PROFESSOR
 *
 * Usage:
 *   npm.cmd run seed:professor-rie
 *   npm.cmd run seed:professor-rie -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedProfessorRIE(seederDataSource);

    console.log('\n🎉 PROFESSOR RIE seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ PROFESSOR RIE seeder failed:', error);
    process.exit(1);
  }
})();
