#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRolesAccessOnRecruiterProfessor } from './seed-roles-access-on-recruiter-professor';

/**
 * Runner pour configurer les accès des autres rôles sur RECRUTEUR et PROFESSOR
 *
 * Usage:
 *   npm.cmd run seed:roles-access-recruiter-professor
 *   npm.cmd run seed:roles-access-recruiter-professor -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedRolesAccessOnRecruiterProfessor(seederDataSource);

    console.log('\n🎉 Roles access seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Roles access seeder failed:', error);
    process.exit(1);
  }
})();
