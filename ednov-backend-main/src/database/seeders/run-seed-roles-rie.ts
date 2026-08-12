import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../utils/get-database-url';
import { seedRolesRie } from './seed-roles-rie';

// Load .env from backend root
config({ path: join(__dirname, '../../../.env') });

/**
 * Standalone runner for seeding role_interface_elements for roles interface.
 * Usage: npx tsx src/database/seeders/run-seed-roles-rie.ts
 * Or with environment: npx tsx src/database/seeders/run-seed-roles-rie.ts -- --env=recette
 */
async function main() {
  const databaseUrl = getDatabaseUrl();

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  console.log('📦 Connecting to database...');
  await dataSource.initialize();

  try {
    await seedRolesRie(dataSource);
    console.log('🎉 Roles RIE seeding completed successfully');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
