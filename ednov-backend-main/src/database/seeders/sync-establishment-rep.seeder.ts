import { DataSource } from 'typeorm';

const UPDATE_BATCH = 2000;
const FETCH_TIMEOUT_MS = 120_000;

type PriorityNetworkValue = 'rep' | 'rep_plus' | 'none';

function mapRepValue(raw: unknown): PriorityNetworkValue {
  const val = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (val === 'REP+') return 'rep_plus';
  if (val === 'REP') return 'rep';
  return 'none';
}

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
 * Fetch ALL records from fr-en-annuaire-education, building a map
 * of UAI → priority_network value.
 *
 * Accepts an optional pre-loaded CSV text to avoid re-downloading
 * when called from the combined runner.
 */
async function fetchRepData(preloadedCsvText?: string): Promise<Map<string, PriorityNetworkValue>> {
  const url =
    'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/exports/csv' +
    '?limit=-1' +
    '&select=identifiant_de_l_etablissement%2Cappartenance_education_prioritaire' +
    '&delimiter=%3B';

  let text: string;

  if (preloadedCsvText) {
    console.log('   Utilisation des données annuaire pré-chargées…');
    text = preloadedCsvText;
  } else {
    console.log(`   Fetching fr-en-annuaire-education…`);
    const res = await fetchWithTimeout(url, { headers: { Accept: 'text/csv' } });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching fr-en-annuaire-education`);
    }
    text = await res.text();
  }

  const lines = text.split('\n');
  const headers = lines[0].split(';').map((h) => h.trim().replace(/^"|"$/g, ''));
  const idxUai = headers.indexOf('identifiant_de_l_etablissement');
  const idxRep = headers.indexOf('appartenance_education_prioritaire');

  if (idxUai === -1 || idxRep === -1) {
    throw new Error(`Colonnes attendues introuvables dans l'annuaire (idxUai=${idxUai}, idxRep=${idxRep})`);
  }

  const result = new Map<string, PriorityNetworkValue>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < headers.length) continue;

    const uai = cols[idxUai]?.toUpperCase();
    if (!uai) continue;

    if (!result.has(uai)) {
      result.set(uai, mapRepValue(cols[idxRep]));
    }
  }

  console.log(`   -> ${result.size} UAI chargés depuis l'annuaire`);
  return result;
}

/**
 * Apply priority_network updates in bulk batches using a single UPDATE … FROM (VALUES …) per batch.
 */
async function applyUpdates(
  ds: DataSource,
  rows: Array<{ uai: string; priorityNetwork: PriorityNetworkValue }>,
): Promise<number> {
  let updated = 0;

  for (let i = 0; i < rows.length; i += UPDATE_BATCH) {
    const batch = rows.slice(i, i + UPDATE_BATCH);

    const placeholders = batch
      .map((_, j) => `($${j * 2 + 1}::text, $${j * 2 + 2}::text)`)
      .join(', ');

    const params = batch.flatMap((r) => [r.priorityNetwork, r.uai]);

    const result = await ds.query(
      `UPDATE establishments e
         SET priority_network = v.priority_network, updated_at = NOW()
         FROM (VALUES ${placeholders}) AS v(priority_network, uai)
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
 * @param ds - DataSource to use for DB updates
 * @param preloadedAnnuaireText - Optional pre-downloaded annuaire CSV text (shared from combined runner)
 */
export async function syncEstablishmentRep(ds: DataSource, preloadedAnnuaireText?: string): Promise<void> {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log("  REP Sync — data.education.gouv.fr → establishments");
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');

  const repMap = await fetchRepData(preloadedAnnuaireText);

  if (repMap.size === 0) {
    console.log('   -> Aucune donnée récupérée.');
    return;
  }

  const updates: Array<{ uai: string; priorityNetwork: PriorityNetworkValue }> = [];
  let repCount = 0;
  let repPlusCount = 0;
  let noneCount = 0;

  for (const [uai, priorityNetwork] of repMap.entries()) {
    updates.push({ uai, priorityNetwork });
    if (priorityNetwork === 'rep') repCount++;
    else if (priorityNetwork === 'rep_plus') repPlusCount++;
    else noneCount++;
  }

  console.log(`\n  Distribution API :`);
  console.log(`   -> REP+  : ${repPlusCount}`);
  console.log(`   -> REP   : ${repCount}`);
  console.log(`   -> Aucun : ${noneCount}`);
  console.log('');

  const matched = await applyUpdates(ds, updates);
  const unmatched = repMap.size - matched;

  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Total mis à jour : ${matched}`);
  console.log(`  Sans correspondance UAI : ${unmatched}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
}

