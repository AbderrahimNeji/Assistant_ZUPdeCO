#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedFixAllTabsVisibility } from './seed-fix-all-tabs-visibility';

/**
 * Runner pour corriger TOUS les problèmes de visibilité des tabs
 *
 * Usage:
 *   npm.cmd run seed:fix-all-tabs-visibility
 *   npm.cmd run seed:fix-all-tabs-visibility -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedFixAllTabsVisibility(seederDataSource);

    console.log('\n🎉 All tabs visibility fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fix all tabs visibility failed:', error);
    process.exit(1);
  }
})();
