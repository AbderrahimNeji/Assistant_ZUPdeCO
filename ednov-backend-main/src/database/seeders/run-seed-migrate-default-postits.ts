import { config } from 'dotenv';
import { join } from 'path';
import { seedMigrateDefaultPostits } from './seed-migrate-default-postits';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

async function main() {
  console.log('📦 Connecting to database...');
  await seederDataSource.initialize();

  try {
    await seedMigrateDefaultPostits(seederDataSource);
    console.log('🎉 Default post-its migration completed successfully');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await seederDataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
