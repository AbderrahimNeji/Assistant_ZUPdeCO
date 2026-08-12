import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../utils/get-database-url';
import { seedUpdateSystemRolesStyles } from './seed-update-system-roles-styles';

// Load .env from backend root
config({ path: join(__dirname, '../../../.env') });

/**
 * Standalone runner for updating system roles with icons/colors.
 * Usage: npm.cmd run seed:update-system-roles-styles
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
    await seedUpdateSystemRolesStyles(dataSource);
    console.log('🎉 System roles styles update completed successfully');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
