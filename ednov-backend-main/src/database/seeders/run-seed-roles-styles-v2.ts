import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../utils/get-database-url';
import { seedRolesStylesV2 } from './seed-roles-styles-v2';

// Charge le .env depuis la racine du backend
config({ path: join(__dirname, '../../../.env') });

/**
 * Runner standalone — met à jour les icônes et couleurs de branding de tous les rôles.
 *
 * Usage:
 *   npm.cmd run seed:roles-styles-v2
 *   npm.cmd run seed:roles-styles-v2 -- --env=recette
 */
async function main() {
  const databaseUrl = getDatabaseUrl();

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  console.log('📦 Connexion à la base de données...');
  await dataSource.initialize();

  try {
    await seedRolesStylesV2(dataSource);
    console.log('🎉 Styles des rôles mis à jour avec succès');
  } catch (error) {
    console.error('💥 Échec du seeder :', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Connexion fermée');
  }
}

main();
