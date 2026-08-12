import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../utils/get-database-url';
import { seedRoleGroups } from './seed-role-groups';

// Load .env from backend root
config({ path: join(__dirname, '../../../.env') });

/**
 * Standalone runner for seeding role_groups.
 * Usage: npx tsx src/database/seeders/run-seed-role-groups.ts
 * Or with environment: npx tsx src/database/seeders/run-seed-role-groups.ts -- --env=recette
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
    await seedRoleGroups(dataSource);
    console.log('🎉 Role groups seeding completed successfully');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
