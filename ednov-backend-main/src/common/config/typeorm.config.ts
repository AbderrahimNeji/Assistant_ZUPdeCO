import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

/**
 * Encodes search_path into the connection URL so that it is applied at the
 * libpq / physical-connection level. This is the only reliable way to set
 * search_path when using the Supabase PgBouncer transaction-mode pooler
 * (port 6543): session-level SET commands are reset between transactions,
 * but URL startup parameters are applied by PgBouncer each time a server
 * connection is assigned to a client.
 *
 * Without this, every raw SQL query executed via manager.query() (i.e. queries
 * that are NOT auto-qualified by TypeORM's schema option) would default to the
 * postgres role search_path ("$user", public) and always hit the `public`
 * schema regardless of DATABASE_SCHEMA — causing wrong stats on the dashboard.
 */
function buildConnectionUrl(): string {
  const base = process.env.DATABASE_URL ?? '';
  const schema = process.env.DATABASE_SCHEMA || 'public';
  // Always include "public" so that extensions installed there (e.g. unaccent) are reachable.
  const searchPath = schema === 'public' ? 'public' : `${schema},public`;
  const param = `options=-c%20search_path%3D${encodeURIComponent(searchPath)}`;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${param}`;
}

export const getTypeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: buildConnectionUrl(),
  schema: process.env.DATABASE_SCHEMA || 'public',
  // Resolved relative to the compiled output root (dist/) at runtime,
  // and relative to src/ root when used via ts-node for migrations.
  entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
  // Do not load migrations in the app — run them via: npm run migration:run (uses data-source.ts)
  migrations: [],
  // Never use synchronize — always use explicit migrations to avoid silent column drops.
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Port 6543 = Supabase transaction-mode pooler (PgBouncer).
  // Session-level settings (statement_timeout, keepAlive, options) are reset
  // after each transaction and must NOT be set here — they cause
  // "Connection terminated unexpectedly" under load.
  extra: {
    max: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 20000,
  },
  // Surface the real error when connection/init fails (e.g. migrations loading)
  verboseRetryLog: true,
});
