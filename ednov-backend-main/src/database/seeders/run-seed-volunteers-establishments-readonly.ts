#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedVolunteersEstablishmentsReadonly } from './seed-volunteers-establishments-readonly';

/**
 * Runner: Rendre les établissements readonly pour le rolegroup 'volunteers'
 * 
 * Usage:
 *   npm run seed:volunteers-establishments-readonly
 *   
 * ou avec ts-node:
 *   npx ts-node src/database/seeders/run-seed-volunteers-establishments-readonly.ts
 */
(async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 SEED: Établissements readonly pour volunteers');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    console.log('📦 Initialisation de la connexion à la base de données...');
    await seederDataSource.initialize();
    console.log('✅ Connexion établie');
    console.log('');

    await seedVolunteersEstablishmentsReadonly(seederDataSource);

    await seederDataSource.destroy();
    console.log('✅ Connexion fermée');
    console.log('');
    console.log('🎉 SEED TERMINÉ AVEC SUCCÈS');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ SEED ÉCHOUÉ');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(error);
    console.error('');
    process.exit(1);
  }
})();
