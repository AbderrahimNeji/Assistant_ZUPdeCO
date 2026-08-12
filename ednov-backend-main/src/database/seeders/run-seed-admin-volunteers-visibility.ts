#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedAdminVolunteersVisibility } from './seed-admin-volunteers-visibility';

/**
 * Runner pour corriger la visibilité de l'interface volunteers pour admin
 *
 * Usage:
 *   npm.cmd run seed:admin-volunteers-visibility
 *   npm.cmd run seed:admin-volunteers-visibility -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedAdminVolunteersVisibility(seederDataSource);

    console.log('\n🎉 Admin volunteers visibility fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Admin volunteers visibility fix failed:', error);
    process.exit(1);
  }
})();
