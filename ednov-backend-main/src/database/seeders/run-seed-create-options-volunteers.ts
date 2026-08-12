#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedCreateOptionsVolunteers } from './seed-create-options-volunteers';

/**
 * Runner pour créer les options de création dans volunteers
 *
 * Usage:
 *   npm.cmd run seed:create-options-volunteers
 *   npm.cmd run seed:create-options-volunteers -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedCreateOptionsVolunteers(seederDataSource);

    console.log('\n🎉 Volunteer creation options seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Volunteer creation options seeder failed:', error);
    process.exit(1);
  }
})();
