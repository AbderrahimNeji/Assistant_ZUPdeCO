import { execSync } from 'child_process';
import { join } from 'path';

/**
 * Runner that spawns a separate process per environment so that
 * seeder-datasource.ts reads the correct schema from process.argv at startup.
 */
const script = join(__dirname, 'run-provision-annually-coordinator-single.ts');

const envs = [
  { label: 'DEV', args: [] },
  { label: 'TESTING', args: ['--env=TESTING'] },
  { label: 'RECETTE', args: ['--env=RECETTE'] },
  { label: 'REMOTE', args: ['--env=REMOTE'] },
];

for (const env of envs) {
  console.log(`\n=== ${env.label} ===`);
  try {
    execSync(
      `npx tsx ${script} ${env.args.join(' ')}`,
      { stdio: 'inherit', cwd: join(__dirname, '../../..') },
    );
  } catch {
    process.exit(1);
  }
}
