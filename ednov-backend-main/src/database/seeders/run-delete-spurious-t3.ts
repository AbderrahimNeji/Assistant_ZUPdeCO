import { config } from 'dotenv';
import { join } from 'path';
import { seederDataSource } from './seeder-datasource';

config({ path: join(__dirname, '../../../.env') });

async function main() {
  await seederDataSource.initialize();
  const r = await seederDataSource.query(
    `UPDATE post_its SET deleted_at = now(), updated_at = now()
     WHERE default_post_it_key LIKE '%bcfdfeb1-a8a7-4696-81cf-3a842af09955%_q2025_t3'
       AND deleted_at IS NULL
     RETURNING id`,
  );
  console.log('T3 spurieux supprimé:', r.length, 'rows');
  await seederDataSource.destroy();
}
main().catch(e => { console.error(e); process.exit(1); });
