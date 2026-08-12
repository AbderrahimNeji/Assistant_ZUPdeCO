import * as dotenv from 'dotenv';
import { join } from 'path';
import { Pool } from 'pg';

dotenv.config({ path: join(__dirname, '../../../.env') });

/**
 * Migration directe BD-to-BD pour establishments et ses tables dépendantes.
 *
 * Lit depuis SOURCE_DATABASE_URL (ancienne BD)
 * et insère dans DATABASE_URL (nouvelle BD, déjà configurée dans .env).
 *
 * Tables migrées dans l'ordre de dépendances:
 *   1. establishments     (66 832 rows — batches de 5000 en lecture, 500 en écriture)
 *   2. rooms              (dépend de establishments)
 *   3. user_establishments (dépend de users + establishments)
 *   4. establishment_coordinators (dépend de establishments + users)
 *
 * Prérequis .env:
 *   SOURCE_DATABASE_URL=postgresql://user:pass@old-host:5432/db
 *   DATABASE_URL=postgresql://user:pass@new-host:5432/db
 *   DATABASE_SSL=true   (optionnel, appliqué aux deux connexions)
 */

const READ_BATCH = 5000;   // rows lus par SELECT depuis la source
const WRITE_BATCH = 500;   // rows par INSERT vers la cible

function buildSslConfig(): { ssl: { rejectUnauthorized: boolean } } | object {
  return process.env.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {};
}

async function getTableColumns(pool: Pool, tableName: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName],
  );
  if (rows.length === 0) {
    throw new Error(`Table "${tableName}" not found in source database`);
  }
  return rows.map((r: any) => r.column_name as string);
}

async function getRowCount(pool: Pool, tableName: string): Promise<number> {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "${tableName}"`);
  return rows[0].cnt as number;
}

async function batchInsert(
  pool: Pool,
  tableName: string,
  columns: string[],
  rows: any[],
): Promise<void> {
  if (rows.length === 0) return;

  const colList = columns.map((c) => `"${c}"`).join(', ');
  const params: any[] = [];
  const valueSets: string[] = [];

  rows.forEach((row, i) => {
    const rowPlaceholders = columns.map((_, j) => `$${i * columns.length + j + 1}`);
    valueSets.push(`(${rowPlaceholders.join(', ')})`);
    columns.forEach((col) => {
      const val = row[col] !== undefined ? row[col] : null;
      // Les colonnes jsonb/json reviennent comme objets JS → re-sérialiser en string
      if (val !== null && typeof val === 'object' && !(val instanceof Date) && !(val instanceof Buffer)) {
        params.push(JSON.stringify(val));
      } else {
        params.push(val);
      }
    });
  });

  await pool.query(
    `INSERT INTO "${tableName}" (${colList}) VALUES ${valueSets.join(', ')} ON CONFLICT DO NOTHING`,
    params,
  );
}

async function migrateTable(
  source: Pool,
  target: Pool,
  tableName: string,
  orderBy: string,
): Promise<number> {
  const total = await getRowCount(source, tableName);

  if (total === 0) {
    console.log(`   ⏭️  ${tableName}: 0 rows — skipped`);
    return 0;
  }

  const columns = await getTableColumns(source, tableName);
  let migrated = 0;

  for (let offset = 0; offset < total; offset += READ_BATCH) {
    const { rows } = await source.query(
      `SELECT * FROM "${tableName}" ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
      [READ_BATCH, offset],
    );

    // Écriture en sous-batches
    for (let i = 0; i < rows.length; i += WRITE_BATCH) {
      await batchInsert(target, tableName, columns, rows.slice(i, i + WRITE_BATCH));
    }

    migrated += rows.length;

    if (total > READ_BATCH) {
      const pct = Math.round((migrated / total) * 100);
      process.stdout.write(`\r      ${tableName}: ${migrated.toLocaleString()}/${total.toLocaleString()} (${pct}%)`);
    }
  }

  if (total > READ_BATCH) {
    process.stdout.write('\n');
  }

  return migrated;
}

/**
 * Point d'entrée exporté — appelé depuis run-all.seeder.ts ou en standalone.
 */
export async function migrateEstablishmentsFromSource(): Promise<void> {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl) {
    console.warn(
      '⚠️  SOURCE_DATABASE_URL non défini dans .env — migration établissements ignorée.\n' +
      '   Pour migrer: ajoutez SOURCE_DATABASE_URL=postgresql://user:pass@old-host:5432/db\n' +
      '   puis relancez: npm run seed:migrate-establishments',
    );
    return;
  }
  if (!targetUrl) {
    throw new Error('DATABASE_URL non défini dans .env');
  }

  const sslConfig = buildSslConfig();
  const source = new Pool({ connectionString: sourceUrl, ...sslConfig });
  const target = new Pool({ connectionString: targetUrl, ...sslConfig });

  try {
    // Vérification des connexions
    await source.query('SELECT 1');
    console.log('   ✅ Source DB connectée  →', redactUrl(sourceUrl));
    await target.query('SELECT 1');
    console.log('   ✅ Target DB connectée  →', redactUrl(targetUrl));
    console.log('');

    // ── 1. establishments (66 832 rows — la plus grosse table) ────────────────
    console.log('   📦 [1/4] establishments...');

    // Récupérer les types distincts depuis la source pour mettre à jour le check constraint
    const { rows: srcTypes } = await source.query(
      `SELECT DISTINCT type FROM establishments WHERE type IS NOT NULL ORDER BY type`
    );
    const allTypes = srcTypes.map((r: any) => r.type as string);
    if (allTypes.length > 0) {
      console.log(`   ℹ️  Types trouvés dans la source: ${allTypes.join(', ')}`);
      // Dropper le check constraint existant sur la cible et le recréer avec tous les types
      await target.query(`ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_type_check`);
      const typeList = allTypes.map((t: string) => `'${t}'`).join(', ');
      await target.query(
        `ALTER TABLE establishments ADD CONSTRAINT establishments_type_check CHECK (type IN (${typeList}))`
      );
      console.log(`   ✅ Check constraint mis à jour avec ${allTypes.length} types`);
    }

    const estCount = await migrateTable(source, target, 'establishments', 'created_at');
    console.log(`   ✅ ${estCount.toLocaleString()} établissements migrés`);

    // ── 2. rooms (dépend de establishments) ──────────────────────────────────
    console.log('   📦 [2/4] rooms...');
    const roomCount = await migrateTable(source, target, 'rooms', 'created_at');
    console.log(`   ✅ ${roomCount.toLocaleString()} salles migrées`);

    // ── 3. user_establishments (dépend de users + establishments) ─────────────
    console.log('   📦 [3/4] user_establishments...');
    const ueCount = await migrateTable(source, target, 'user_establishments', 'created_at');
    console.log(`   ✅ ${ueCount.toLocaleString()} user_establishments migrées`);

    // ── 4. establishment_coordinators (dépend de establishments + users) ──────
    console.log('   📦 [4/4] establishment_coordinators...');
    const ecCount = await migrateTable(source, target, 'establishment_coordinators', 'created_at');
    console.log(`   ✅ ${ecCount.toLocaleString()} coordinateurs migrés`);

  } finally {
    await source.end();
    await target.end();
  }
}

/** Masque le mot de passe dans l'URL pour les logs */
function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '****';
    return u.toString();
  } catch {
    return url.replace(/:([^:@]+)@/, ':****@');
  }
}
