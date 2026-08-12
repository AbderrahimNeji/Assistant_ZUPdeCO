import { DataSource } from 'typeorm';

const API_BASE = 'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets';
const UPDATE_BATCH = 2000;
const FETCH_TIMEOUT_MS = 120_000;

/**
 * Datasets IPS officiels du ministère de l'Éducation nationale.
 * Champ UAI : `uai` dans tous les datasets.
 * Champ IPS : `ips` (écoles / collèges), `ips_etab` (lycées / pro).
 */
const DATASETS = [
  {
    id: 'fr-en-ips-ecoles-ap2022',
    ipsField: 'ips' as const,
    label: 'Écoles (primaire)',
  },
  {
    id: 'fr-en-ips-colleges-ap2023',
    ipsField: 'ips' as const,
    label: 'Collèges',
  },
  {
    id: 'fr-en-ips-lycees-ap2023',
    ipsField: 'ips_etab' as const,
    label: 'Lycées & Professionnels',
  },
] as const;

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

export function buildIpsDatasetUrl(datasetId: string, ipsField: string): string {
  return (
    `${API_BASE}/${datasetId}/exports/csv` +
    `?limit=-1` +
    `&order_by=rentree_scolaire%20desc` +
    `&select=uai%2C${ipsField}%2Crentree_scolaire` +
    `&delimiter=%3B`
  );
}

export { DATASETS };

/**
 * Fetch ALL records from one dataset, keeping only the most recent entry per UAI.
 * Accepts optional pre-loaded CSV text to skip the HTTP fetch.
 * Returns a Map<uai_uppercase, { ips: number; rentree: string }>.
 */
async function fetchDataset(
  datasetId: string,
  ipsField: string,
  preloadedCsvText?: string,
): Promise<Map<string, { ips: number; rentree: string }>> {
  let rawText: string;

  if (preloadedCsvText) {
    console.log(`   Utilisation du fichier local pour ${datasetId}…`);
    rawText = preloadedCsvText;
  } else {
    const url = buildIpsDatasetUrl(datasetId, ipsField);
    console.log(`   Fetching ${datasetId}…`);
    const res = await fetchWithTimeout(url, { headers: { Accept: 'text/csv' } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${datasetId}`);
    }
    rawText = await res.text();
  }

  const lines = rawText.split('\n');
  const headers = lines[0].split(';').map((h) => h.trim().replace(/^"|"$/g, ''));
  const idxUai = headers.indexOf('uai');
  const idxIps = headers.indexOf(ipsField);
  const idxRentree = headers.indexOf('rentree_scolaire');

  const result = new Map<string, { ips: number; rentree: string }>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < headers.length) continue;

    const uai = cols[idxUai]?.toUpperCase();
    if (!uai) continue;

    const ips = parseFloat(cols[idxIps]);
    if (Number.isNaN(ips)) continue;

    if (!result.has(uai)) {
      result.set(uai, { ips, rentree: cols[idxRentree] ?? '' });
    }
  }

  console.log(`   -> ${result.size} UAI chargés depuis ${datasetId}`);
  return result;
}

/**
 * Apply IPS updates in bulk batches using a single UPDATE … FROM (VALUES …) per batch.
 */
async function applyUpdates(
  ds: DataSource,
  rows: Array<{ uai: string; ips: number; year: string; source: string }>,
): Promise<number> {
  let updated = 0;

  for (let i = 0; i < rows.length; i += UPDATE_BATCH) {
    const batch = rows.slice(i, i + UPDATE_BATCH);

    const placeholders = batch
      .map((_, j) => `($${j * 4 + 1}::numeric, $${j * 4 + 2}::text, $${j * 4 + 3}::text, $${j * 4 + 4}::text)`)
      .join(', ');

    const params = batch.flatMap((r) => [r.ips, r.year, r.source, r.uai]);

    const result = await ds.query(
      `UPDATE establishments e
         SET ips_value = v.ips, ips_year = v.year, ips_source = v.source, updated_at = NOW()
         FROM (VALUES ${placeholders}) AS v(ips, year, source, uai)
         WHERE e.uai_code = v.uai AND e.deleted_at IS NULL`,
      params,
    );

    const count = Array.isArray(result) && result.length >= 2 ? Number(result[1]) : 0;
    updated += count;

    process.stdout.write(`\r   -> Batch ${Math.ceil((i + UPDATE_BATCH) / UPDATE_BATCH)}/${Math.ceil(rows.length / UPDATE_BATCH)} — ${updated} mis à jour`);
  }

  process.stdout.write('\n');
  return updated;
}

/**
 * @param ds - DataSource for DB updates
 * @param preloadedCsvTexts - Optional map of datasetId → raw CSV text (from local files)
 */
export async function syncEstablishmentIps(
  ds: DataSource,
  preloadedCsvTexts?: Record<string, string>,
): Promise<void> {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  IPS Sync — data.education.gouv.fr → establishments');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');

  const hasLocal = preloadedCsvTexts && Object.keys(preloadedCsvTexts).length > 0;
  console.log(hasLocal ? '  Utilisation des fichiers locaux IPS…' : `  Téléchargement de ${DATASETS.length} datasets en parallèle…`);

  // Fetch all datasets in parallel (or parse from preloaded)
  const results = await Promise.allSettled(
    DATASETS.map((d) =>
      fetchDataset(d.id, d.ipsField, preloadedCsvTexts?.[d.id]).then((map) => ({ dataset: d, map })),
    ),
  );

  let totalMatched = 0;
  let totalUnmatched = 0;

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`\n   ❌ Erreur dataset : ${String(result.reason)}`);
      continue;
    }

    const { dataset, map: ipsMap } = result.value;
    console.log(`\n[${dataset.label}] Dataset: ${dataset.id}`);

    if (ipsMap.size === 0) {
      console.log('   -> Aucune donnée récupérée, passage au suivant.');
      continue;
    }

    const updates: Array<{ uai: string; ips: number; year: string; source: string }> = [];
    for (const [uai, { ips, rentree }] of ipsMap.entries()) {
      updates.push({ uai, ips, year: rentree, source: dataset.id });
    }

    const matched = await applyUpdates(ds, updates);
    const unmatched = ipsMap.size - matched;

    totalMatched += matched;
    totalUnmatched += unmatched;

    console.log(`   -> Mis à jour : ${matched} / ${ipsMap.size} (${unmatched} sans correspondance UAI)`);
  }

  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Total mis à jour : ${totalMatched}`);
  console.log(`  Sans correspondance UAI : ${totalUnmatched}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}
