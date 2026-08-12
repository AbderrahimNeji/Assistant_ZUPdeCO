#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedPluralizeAdminTabs } from './seed-pluralize-admin-tabs';

/**
 * Runner pour pluraliser les labels des tabs admin
 *
 * Usage:
 *   npm.cmd run seed:pluralize-admin-tabs
 *   npm.cmd run seed:pluralize-admin-tabs -- --env=recette
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedPluralizeAdminTabs(seederDataSource);

    console.log('\n🎉 Tabs pluralized successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Pluralize tabs failed:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) {
      await seederDataSource.destroy();
    }
  }
})();
