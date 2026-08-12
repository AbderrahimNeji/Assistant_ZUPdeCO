/**
 * Runner for the write scope initialization migration.
 *
 * Usage:
 *   # Dry run (default — safe, no DB changes):
 *   npx.cmd ts-node -r tsconfig-paths/register \
 *     src/database/seeders/run-seed-init-write-scopes.ts
 *
 *   # Live run (writes changes to the DB):
 *   DRY_RUN=false npx.cmd ts-node -r tsconfig-paths/register \
 *     src/database/seeders/run-seed-init-write-scopes.ts
 *
 * WARNING: Review dry-run output carefully before running live.
 *          This file should NOT be executed in CI or automated pipelines.
 */
import { seederDataSource } from './seeder-datasource';
import { seedInitWriteScopes } from './seed-init-write-scopes';

const dryRun = process.env.DRY_RUN !== 'false';

async function main() {
  await seederDataSource.initialize();

  try {
    await seedInitWriteScopes(seederDataSource, { dryRun });
  } finally {
    await seederDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
