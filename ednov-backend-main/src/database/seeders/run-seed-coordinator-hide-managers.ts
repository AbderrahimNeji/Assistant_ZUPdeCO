#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedCoordinatorHideManagers } from './seed-coordinator-hide-managers';

/**
 * Runner pour supprimer au coordinateur le droit de voir les managers
 *
 * Usage:
 *   npm.cmd run seed:coordinator-hide-managers
 */

(async () => {
  try {
    console.log('📦 Initialisation de la source de données...');
    await seederDataSource.initialize();
    console.log('✅ Source de données initialisée\n');

    await seedCoordinatorHideManagers(seederDataSource);

    console.log('\n🎉 Suppression des droits coordinator sur les managers terminée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Échec de la suppression des droits coordinator:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) {
      await seederDataSource.destroy();
    }
  }
})();
