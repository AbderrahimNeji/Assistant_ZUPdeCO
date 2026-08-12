import { config } from 'dotenv';
import { join } from 'path';
import { seedPostitsInterfaceElements } from './seed-postits-interface-elements';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

async function main() {
  console.log('📦 Connecting to database...');
  await seederDataSource.initialize();

  try {
    await seedPostitsInterfaceElements(seederDataSource);
    console.log('🎉 Post-its interface elements seeding completed successfully');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await seederDataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

main();
