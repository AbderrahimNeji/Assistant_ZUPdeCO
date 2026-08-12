/**
 * Combined runner: syncs IPS, QPV and REP sequentially (DB) with parallel downloads.
 *
 * Reads from local cache files in data/sync/ if available (run download:sync-data first).
 * Falls back to live API if local files are missing.
 *
 * Optimisations:
 *  - Local files → no internet needed during sync
 *  - Annuaire downloaded once, shared by QPV and REP
 *  - IPS: 3 datasets fetched in parallel if no local cache
 *  - DB updates sequential to avoid connection pool saturation
 */

import * as fs from 'fs';
import * as path from 'path';
import { seederDataSource } from './seeder-datasource';
import { syncEstablishmentIps, DATASETS, buildIpsDatasetUrl } from './sync-establishment-ips.seeder';
import { syncEstablishmentQpv, resolveQpvCsvUrl } from './sync-establishment-qpv.seeder';
import { syncEstablishmentRep } from './sync-establishment-rep.seeder';

const DATA_DIR = path.join(__dirname, 'data', 'sync');
const FETCH_TIMEOUT_MS = 120_000;

/**
 * Read a local file if it exists and is non-empty.
 * Returns the file content or null if not found.
 */
function readLocalFile(filename: string): string | null {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.trim().length > 0) {
        const lines = content.split('\n').length - 1;
        console.log(`  [cache] ${filename} — ${lines} lignes`);
        return content;
      }
    }
  } catch {
    // fall through to API
  }
  return null;
}

/**
 * Fetch a CSV from the API with timeout. Used when no local file is available.
 */
async function fetchCsv(url: string, label: string): Promise<string> {
  console.log(`  [API] Fetching ${label}…`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/csv,text/plain,*/*' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n').length - 1;
    console.log(`  [API] ${label} — ${lines} lignes`);
    return text;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Read from local file if available, otherwise fetch from API.
 */
async function readOrFetch(filename: string, url: string, label: string): Promise<string> {
  return readLocalFile(filename) ?? (await fetchCsv(url, label));
}

const ANNUAIRE_COMBINED_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/exports/csv' +
  '?limit=-1' +
  '&select=identifiant_de_l_etablissement%2Ccode_commune%2Cappartenance_education_prioritaire' +
  '&delimiter=%3B';

/**
 * Parse the combined annuaire CSV text into a UAI → code_commune map.
 */
function parseUaiToCommune(csvText: string): Map<string, string> {
  const lines = csvText.split('\n');
  const headers = lines[0].split(';').map((h) => h.trim().replace(/^"|"$/g, ''));
  const idxUai = headers.indexOf('identifiant_de_l_etablissement');
  const idxCommune = headers.indexOf('code_commune');

  const map = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < headers.length) continue;
    const uai = cols[idxUai]?.toUpperCase();
    const commune = cols[idxCommune]?.trim();
    if (uai && commune && !map.has(uai)) {
      map.set(uai, commune);
    }
  }
  return map;
}

async function main() {
  const start = Date.now();

  try {
    await seederDataSource.initialize();

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     SYNC ALL — IPS + QPV + REP                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    const hasCache = fs.existsSync(DATA_DIR);
    console.log(hasCache
      ? `  Mode : fichiers locaux (data/sync/) avec fallback API`
      : `  Mode : téléchargement API (aucun fichier local trouvé)`
    );
    console.log('');

    // Phase 1: load annuaire + IPS + QPV (local or API), all in parallel
    console.log('  Phase 1 — chargement des données…');

    const ipsFilenames = DATASETS.map(
      (d) => `ips-${d.id.replace('fr-en-ips-', '').replace(/-ap\d+$/, '')}.csv`,
    );

    // Resolve QPV URL only if no local file
    const qpvLocal = readLocalFile('qpv.csv');
    const qpvUrlPromise = qpvLocal
      ? Promise.resolve('')
      : resolveQpvCsvUrl().then((url) => {
          console.log(`  [API] URL QPV résolue → ${url}`);
          return url;
        });

    const [annuaireCsvText, ...ipsAndQpv] = await Promise.all([
      readOrFetch('annuaire.csv', ANNUAIRE_COMBINED_URL, 'Annuaire éducation nationale'),
      ...DATASETS.map((d, i) =>
        readOrFetch(ipsFilenames[i], buildIpsDatasetUrl(d.id, d.ipsField), `IPS ${d.label}`),
      ),
      qpvUrlPromise.then((qpvUrl) =>
        qpvLocal
          ? Promise.resolve(qpvLocal)
          : fetchCsv(qpvUrl, 'QPV ANCT'),
      ),
    ]);

    // Split results: first N are IPS texts, last one is QPV
    const ipsCsvTexts: Record<string, string> = {};
    DATASETS.forEach((d, i) => {
      ipsCsvTexts[d.id] = ipsAndQpv[i];
    });
    const qpvCsvText = ipsAndQpv[DATASETS.length] as string;

    const uaiToCommune = parseUaiToCommune(annuaireCsvText);
    console.log(`\n  ${uaiToCommune.size} établissements prêts (annuaire)\n`);

    // Phase 2: DB updates — sequential to avoid connection pool saturation
    console.log('  Phase 2 — mise à jour base de données (REP → QPV → IPS)…\n');
    await syncEstablishmentRep(seederDataSource, annuaireCsvText);
    await syncEstablishmentQpv(seederDataSource, uaiToCommune, qpvCsvText);
    await syncEstablishmentIps(seederDataSource, ipsCsvTexts);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log(`║  ✅ SYNC ALL terminé en ${elapsed}s`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED:', error);
    process.exit(1);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }
}

main();
