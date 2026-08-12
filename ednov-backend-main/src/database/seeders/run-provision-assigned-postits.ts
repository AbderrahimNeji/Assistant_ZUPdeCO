import { config } from 'dotenv';
import { join } from 'path';
import { provisionAssignedPostIts } from './provision-assigned-postits';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

async function main() {
  console.log('📦 Connecting to database...');
  await seederDataSource.initialize();

  try {
    await provisionAssignedPostIts(seederDataSource);
    console.log('🎉 Provisioning completed successfully');
  } catch (error) {
    console.error('💥 Provisioning failed:', error);
    process.exit(1);
  } finally {
    await seederDataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
