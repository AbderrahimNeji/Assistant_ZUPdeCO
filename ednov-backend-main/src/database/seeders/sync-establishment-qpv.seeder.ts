import { DataSource } from 'typeorm';

/**
 * Sync QPV (Quartier Prioritaire de la Ville) status for establishments.
 *
 * Strategy (two API calls, no geocoding required):
 *   1. data.education.gouv.fr — "fr-en-annuaire-education" CSV:
 *      UAI (identifiant_de_l_etablissement) → code_commune (INSEE)
 *   2. ANCT via data.gouv.fr — QPV list CSV (listeqp2024-cog2024.csv):
 *      insee_com column = INSEE commune code of every commune that contains at least one QPV
 *
 * Result: establishments whose commune is a QPV commune → is_qpv = true.
 *         establishments matched but NOT in a QPV commune  → is_qpv = false.
 *         establishments with no UAI in annuaire → left untouched.
 */

export const ANNUAIRE_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/exports/csv' +
  '?limit=-1&select=identifiant_de_l_etablissement%2Ccode_commune&delimiter=%3B';

const QPV_DATASET_SLUG = 'quartiers-prioritaires-de-la-politique-de-la-ville-qpv';
const DATA_GOUV_API = 'https://www.data.gouv.fr/api/1/datasets';

/**
 * Fallback direct URL for the QPV CSV (ANCT 2024).
 * Used when the data.gouv.fr metadata API is slow or unavailable.
 */
const QPV_CSV_FALLBACK_URL =
  'https://www.data.gouv.fr/fr/datasets/r/04a51984-3e2a-4949-ba30-6bb1b81aff78';

const UPDATE_BATCH = 2000;
const FETCH_TIMEOUT_MS = 120_000;

/**
 * Fetch with an AbortController timeout. Retries once on timeout/network error.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, retries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      const isLast = attempt === retries;
      if (isLast) throw err;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      console.warn(`   ⚠ ${isAbort ? 'Timeout' : 'Erreur réseau'} — retry ${attempt + 1}/${retries}…`);
    }
  }
  throw new Error('unreachable');
}

/**
 * Parse a CSV response (semicolon or comma delimited) and return rows as objects.
 */
function parseCsv(text: string, delimiter: string): Record<string, string>[] {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Fetch UAI → code_commune map from the education ministry annuaire.
 * Exported so it can be shared with the REP seeder in the combined runner.
 */
export async function fetchUaiToCommune(): Promise<Map<string, string>> {
  console.log('   Fetching annuaire établissements (UAI → code_commune)…');
  const res = await fetchWithTimeout(ANNUAIRE_URL, { headers: { Accept: 'text/csv' } });
  if (!res.ok) throw new Error(`Annuaire HTTP ${res.status}`);

  const rows = parseCsv(await res.text(), ';');
  const map = new Map<string, string>();
  for (const row of rows) {
    const uai = (row['identifiant_de_l_etablissement'] ?? '').toUpperCase().trim();
    const commune = (row['code_commune'] ?? '').trim();
    if (uai && commune && !map.has(uai)) {
      map.set(uai, commune);
    }
  }
  console.log(`   -> ${map.size} établissements chargés depuis l'annuaire`);
  return map;
}

/**
 * Resolve the QPV CSV URL from the data.gouv.fr metadata API.
 * Falls back to the hardcoded URL if the API is unavailable or slow.
 * Exported for use in the download script.
 */
export async function resolveQpvCsvUrl(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(`${DATA_GOUV_API}/${QPV_DATASET_SLUG}/`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`data.gouv.fr API HTTP ${res.status}`);

    const json = (await res.json()) as { resources: Array<{ url: string; format: string }> };
    const resource = json.resources.find(
      (r) => r.format?.toLowerCase() === 'csv' && r.url.includes('listeqp'),
    );
    if (resource) {
      console.log(`   URL QPV résolue via API data.gouv.fr`);
      return resource.url;
    }
  } catch {
    // fall through to hardcoded URL
  }

  console.warn(`   ⚠ API data.gouv.fr indisponible — utilisation de l'URL de fallback QPV`);
  return QPV_CSV_FALLBACK_URL;
}

/**
 * Fetch the set of INSEE commune codes that contain at least one QPV.
 * Accepts optional pre-loaded CSV text to skip the HTTP fetch.
 */
async function fetchQpvCommuneCodes(preloadedCsvText?: string): Promise<Set<string>> {
  let text: string;

  if (preloadedCsvText) {
    console.log('   Utilisation du fichier local QPV…');
    text = preloadedCsvText;
  } else {
    console.log('   Résolution URL QPV…');
    const csvUrl = await resolveQpvCsvUrl();
    console.log(`   Fetching liste QPV : ${csvUrl}`);
    const res = await fetchWithTimeout(csvUrl, { headers: { Accept: 'text/csv,text/plain,*/*' } });
    if (!res.ok) throw new Error(`QPV CSV HTTP ${res.status} — ${csvUrl}`);
    text = await res.text();
  }
  const firstLine = text.split('\n')[0] ?? '';
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const rows = parseCsv(text, delimiter);
  const communeSet = new Set<string>();

  const communeFields = ['insee_com', 'DEPCOM', 'depcom', 'code_commune', 'code_insee'];

  for (const row of rows) {
    for (const field of communeFields) {
      const val = (row[field] ?? '').trim();
      if (val) {
        communeSet.add(val);
        break;
      }
    }
  }

  console.log(`   -> ${communeSet.size} communes QPV identifiées`);
  return communeSet;
}

/**
 * Apply is_qpv updates in bulk batches using a single UPDATE … FROM (VALUES …) per batch.
 */
async function applyQpvUpdates(
  ds: DataSource,
  updates: Array<{ uai: string; isQpv: boolean }>,
): Promise<number> {
  let updated = 0;

  for (let i = 0; i < updates.length; i += UPDATE_BATCH) {
    const batch = updates.slice(i, i + UPDATE_BATCH);

    const placeholders = batch
      .map((_, j) => `($${j * 2 + 1}::boolean, $${j * 2 + 2}::text)`)
      .join(', ');

    const params = batch.flatMap(({ isQpv, uai }) => [isQpv, uai]);

    const result = await ds.query(
      `UPDATE establishments e
         SET is_qpv = v.is_qpv, updated_at = NOW()
         FROM (VALUES ${placeholders}) AS v(is_qpv, uai)
         WHERE e.uai_code = v.uai AND e.deleted_at IS NULL`,
      params,
    );

    const count = Array.isArray(result) && result.length >= 2 ? Number(result[1]) : 0;
    updated += count;

    process.stdout.write(`\r   -> Batch ${Math.ceil((i + UPDATE_BATCH) / UPDATE_BATCH)}/${Math.ceil(updates.length / UPDATE_BATCH)} — ${updated} mis à jour`);
  }

  process.stdout.write('\n');
  return updated;
}

export async function syncEstablishmentQpv(
  ds: DataSource,
  preloadedUaiToCommune?: Map<string, string>,
  preloadedQpvCsvText?: string,
): Promise<void> {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  QPV Sync — ANCT + data.education.gouv.fr → establishments');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');

  const [uaiToCommune, qpvCommunes] = await Promise.all([
    preloadedUaiToCommune ? Promise.resolve(preloadedUaiToCommune) : fetchUaiToCommune(),
    fetchQpvCommuneCodes(preloadedQpvCsvText),
  ]);

  const updates: Array<{ uai: string; isQpv: boolean }> = [];
  for (const [uai, commune] of uaiToCommune.entries()) {
    updates.push({ uai, isQpv: qpvCommunes.has(commune) });
  }

  const qpvCount = updates.filter((u) => u.isQpv).length;
  console.log(`\n   ${qpvCount} établissements détectés en QPV sur ${updates.length} dans l'annuaire`);

  const updated = await applyQpvUpdates(ds, updates);

  const qpvUpdated = updates.filter((u) => u.isQpv).length;
  const nonQpvUpdated = updates.filter((u) => !u.isQpv).length;

  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Total mis à jour : ${updated}`);
  console.log(`  En QPV (true)    : ${qpvUpdated} dans l'annuaire`);
  console.log(`  Hors QPV (false) : ${nonQpvUpdated} dans l'annuaire`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}
