#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedProfessorVolunteersMigration } from './seed-professor-volunteers-migration';

/**
 * Runner pour la migration du rôle PROFESSOR vers le groupe volunteers
 *
 * Usage:
 *   npm.cmd run seed:professor-volunteers-migration
 *   npm.cmd run seed:professor-volunteers-migration -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedProfessorVolunteersMigration(seederDataSource);

    console.log('\n🎉 PROFESSOR volunteers migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ PROFESSOR volunteers migration failed:', error);
    process.exit(1);
  }
})();
