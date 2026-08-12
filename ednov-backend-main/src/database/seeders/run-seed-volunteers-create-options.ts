#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedVolunteersCreateOptions } from './seed-volunteers-create-options';

(async () => {
  try {
    await seederDataSource.initialize();
    await seedVolunteersCreateOptions(seederDataSource);
    console.log('\n🎉 Done');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
})();
