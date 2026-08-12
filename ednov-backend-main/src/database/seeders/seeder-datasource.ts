import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { getDatabaseUrl } from '../utils/get-database-url';

config({ path: join(__dirname, '../../../.env') });

function resolveSchema(): string {
  const envArg = process.argv.find(arg => arg.startsWith('--env='));
  const targetEnv = envArg ? envArg.split('=')[1].toUpperCase() : null;
  if (targetEnv) {
    const specific = process.env[`DATABASE_SCHEMA_${targetEnv}`];
    if (specific) return specific;
  }
  return process.env.DATABASE_SCHEMA || 'public';
}

/** DataSource partagée pour tous les seeders — logging désactivé. */
export const seederDataSource = new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  schema: resolveSchema(),
  entities: [],
  migrations: [],
  synchronize: false,
  logging: false,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: { connectionTimeoutMillis: 10000, max: 5, idleTimeoutMillis: 30000, options: `-c search_path=${resolveSchema()}` },
});
