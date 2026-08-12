#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedTutorsCreateOptions } from './seed-tutors-create-options';

(async () => {
  try {
    await seederDataSource.initialize();
    await seedTutorsCreateOptions(seederDataSource);
    console.log('\n🎉 Done');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
})();
