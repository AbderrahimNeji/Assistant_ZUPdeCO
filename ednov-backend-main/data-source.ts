import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getDatabaseUrl } from './src/database/utils/get-database-url';

dotenv.config();

/**
 * TypeORM DataSource for CLI migrations.
 * Usage:
 *   npx typeorm migration:run -d ./data-source.ts
 *   npx typeorm migration:generate ./migrations/InitialSchema -d ./data-source.ts
 *   
 * Utilise --env pour cibler un environnement spécifique:
 *   npx typeorm migration:run -d ./data-source.ts -- --env=recette
 */
function resolveSchema(): string {
  const envArg = process.argv.find(arg => arg.startsWith('--env='));
  const targetEnv = envArg ? envArg.split('=')[1].toUpperCase() : null;
  if (targetEnv) {
    const specific = process.env[`DATABASE_SCHEMA_${targetEnv}`];
    if (specific) return specific;
  }
  return process.env.DATABASE_SCHEMA || 'public';
}

const schema = resolveSchema();

export default new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  schema,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    connectionTimeoutMillis: 10000,
    max: 20,
    idleTimeoutMillis: 30000,
    options: `-c search_path=${schema}`,
  },
});
