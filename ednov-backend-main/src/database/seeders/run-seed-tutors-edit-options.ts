#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedTutorsEditOptions } from './seed-tutors-edit-options';

(async () => {
  try {
    await seederDataSource.initialize();
    await seedTutorsEditOptions(seederDataSource);
    console.log('\n🎉 Done');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
})();
