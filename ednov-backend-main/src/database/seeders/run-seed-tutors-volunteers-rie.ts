import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../utils/get-database-url';
import { seedTutorsVolunteersRie } from './seed-tutors-volunteers-rie';

config({ path: join(__dirname, '../../../.env') });

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
    await seedTutorsVolunteersRie(dataSource);
    console.log('🎉 Tutors/Volunteers RIE seeding completed successfully');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
