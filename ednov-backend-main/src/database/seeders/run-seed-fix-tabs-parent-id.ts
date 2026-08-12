#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedFixTabsParentId } from './seed-fix-tabs-parent-id';

/**
 * Runner pour corriger les parent_id des tabs
 *
 * Usage:
 *   npm.cmd run seed:fix-tabs-parent-id
 *   npm.cmd run seed:fix-tabs-parent-id -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedFixTabsParentId(seederDataSource);

    console.log('\n🎉 Tabs parent_id fixed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fix tabs parent_id failed:', error);
    process.exit(1);
  }
})();
