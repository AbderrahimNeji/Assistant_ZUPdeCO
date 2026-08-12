import { config } from 'dotenv';
import { join } from 'path';
import { seederDataSource } from './seeder-datasource';
import { provisionAnnuallyCoordinator } from './provision-annually-coordinator';

config({ path: join(__dirname, '../../../.env') });

async function main() {
  const envArg = process.argv.find(a => a.startsWith('--env='));
  const label = envArg ? envArg.split('=')[1].toUpperCase() : 'DEV';
  console.log(`🔌 Environment: ${label}`);

  await seederDataSource.initialize();
  try {
    await provisionAnnuallyCoordinator(seederDataSource);
    console.log('✅ Done');
  } catch (err) {
    console.error('💥', err);
    process.exit(1);
  } finally {
    await seederDataSource.destroy();
  }
}

main();
