#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedRecruiterFixTabs } from './seed-recruiter-fix-tabs';

(async () => {
  try {
    await seederDataSource.initialize();
    await seedRecruiterFixTabs(seederDataSource);
    console.log('\n🎉 Done');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
})();
