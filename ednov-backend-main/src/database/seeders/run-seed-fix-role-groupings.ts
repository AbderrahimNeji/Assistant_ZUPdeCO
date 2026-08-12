import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../utils/get-database-url';
import { seedFixRoleGroupings } from './seed-fix-role-groupings';

// Load .env from backend root
config({ path: join(__dirname, '../../../.env') });

/**
 * Standalone runner for fixing role groupings and interface elements.
 * Usage: npm.cmd run seed:fix-role-groupings
 */
async function main() {
  const databaseUrl = getDatabaseUrl();

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  console.log('📦 Connecting to database...');
  await dataSource.initialize();

  try {
    await seedFixRoleGroupings(dataSource);
    console.log('🎉 Role grouping fix completed successfully');
  } catch (error) {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
