/**
 * Standalone download script — saves all CSVs needed by the sync seeders to disk.
 * Does NOT need a DB connection.
 *
 * Files saved in src/database/seeders/data/sync/:
 *   annuaire.csv         — fr-en-annuaire-education (code_commune + REP)
 *   ips-ecoles.csv       — IPS écoles primaires
 *   ips-colleges.csv     — IPS collèges
 *   ips-lycees.csv       — IPS lycées & professionnels
 *   qpv.csv              — Liste QPV ANCT (communes QPV)
 *
 * Usage:
 *   npm run download:sync-data
 * Then run:
 *   npm run sync:establishment-all   (reads local files, no internet needed)
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildIpsDatasetUrl, DATASETS } from './sync-establishment-ips.seeder';
import { resolveQpvCsvUrl } from './sync-establishment-qpv.seeder';

const DATA_DIR = path.join(__dirname, 'data', 'sync');
const FETCH_TIMEOUT_MS = 120_000;

const ANNUAIRE_COMBINED_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/exports/csv' +
  '?limit=-1' +
  '&select=identifiant_de_l_etablissement%2Ccode_commune%2Cappartenance_education_prioritaire' +
  '&delimiter=%3B';

async function fetchWithTimeout(url: string, label: string): Promise<string> {
  console.log(`  Téléchargement : ${label}…`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/csv,text/plain,*/*' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);

    const text = await res.text();
    const lines = text.split('\n').length - 1;
    console.log(`  ✓ ${label} — ${lines} lignes`);
    return text;
  } catch (err) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    throw new Error(`${isAbort ? 'Timeout' : 'Erreur'} pour ${label}: ${String(err)}`);
  }
}

function saveFile(filename: string, content: string): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  const kb = Math.round(Buffer.byteLength(content, 'utf-8') / 1024);
  console.log(`  -> Sauvegardé : data/sync/${filename} (${kb} KB)`);
}

async function main() {
  const start = Date.now();

  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     DOWNLOAD SYNC DATA — téléchargement des CSVs            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Dossier cible : ${DATA_DIR}`);
  console.log('');

  // Resolve QPV URL before launching parallel downloads
  console.log('  Résolution URL QPV…');
  const qpvUrl = await resolveQpvCsvUrl();
  console.log(`  -> URL QPV : ${qpvUrl}`);
  console.log('');
  console.log('  Téléchargements en parallèle…');
  console.log('');

  const downloads: Array<{ filename: string; promise: Promise<string> }> = [
    {
      filename: 'annuaire.csv',
      promise: fetchWithTimeout(ANNUAIRE_COMBINED_URL, 'Annuaire éducation nationale'),
    },
    ...DATASETS.map((d) => ({
      filename: `ips-${d.id.replace('fr-en-ips-', '').replace(/-ap\d+$/, '')}.csv`,
      promise: fetchWithTimeout(buildIpsDatasetUrl(d.id, d.ipsField), `IPS ${d.label}`),
    })),
    {
      filename: 'qpv.csv',
      promise: fetchWithTimeout(qpvUrl, 'Liste QPV ANCT'),
    },
  ];

  const results = await Promise.allSettled(downloads.map((d) => d.promise));

  console.log('');
  let errors = 0;

  for (let i = 0; i < downloads.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      saveFile(downloads[i].filename, result.value);
    } else {
      console.error(`  ❌ Échec : ${downloads[i].filename} — ${String(result.reason)}`);
      errors++;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('');

  if (errors > 0) {
    console.log(`╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║  ⚠ Terminé avec ${errors} erreur(s) en ${elapsed}s`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    process.exit(1);
  } else {
    console.log(`╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║  ✅ ${downloads.length} fichiers téléchargés en ${elapsed}s`);
    console.log(`║  Lancez maintenant : npm run sync:establishment-all`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);
    console.log('');
    process.exit(0);
  }
}

main();
