#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedPostItsTrackingIe } from './seed-postits-tracking-ie';

/**
 * Runner pour le seeder de l'interface element "postits-assigned-tracking"
 *
 * Usage:
 *   npm.cmd run seed:postits-tracking-ie
 *
 * Ce seeder insère l'interface element `postits-assigned-tracking` et le lie
 * au rôle `admin`, ce qui rend le bouton "Suivi" visible uniquement pour les
 * administrateurs sur les post-its assignés.
 */

(async () => {
  try {
    console.log('📦 Initializing datasource...');
    await seederDataSource.initialize();
    console.log('✅ Datasource initialized\n');

    await seedPostItsTrackingIe(seederDataSource);

    console.log('\n🎉 postits-tracking-ie seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ postits-tracking-ie seeder failed:', error);
    process.exit(1);
  }
})();
