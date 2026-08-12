import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../utils/get-database-url';
import { seedMigrateRoleGroups } from './seed-migrate-role-groups';

// Load .env from backend root
config({ path: join(__dirname, '../../../.env') });

/**
 * Standalone runner for migrating role_group of tutor/volunteer/student roles.
 * Usage: npm.cmd run seed:migrate-role-groups
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
    await seedMigrateRoleGroups(dataSource);
    console.log('🎉 Role group migration completed successfully');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
