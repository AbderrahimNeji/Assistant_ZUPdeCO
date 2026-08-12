#!/usr/bin/env ts-node
import 'dotenv/config';
import { seederDataSource } from './seeder-datasource';
import { seedTutorsRemoveProfessor } from './seed-tutors-remove-professor';

(async () => {
  try {
    await seederDataSource.initialize();
    await seedTutorsRemoveProfessor(seederDataSource);
    console.log('\n🎉 Done');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
})();
