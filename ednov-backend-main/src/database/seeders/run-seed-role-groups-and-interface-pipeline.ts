/**
 * Pipeline ordonné : groupes de rôles → migration / correctifs → socle rôles (complete)
 * → passes ciblées (idempotentes) → interface_elements / RIE → styles.
 *
 * Exécution identique aux runners isolés : chaque étape est lancée dans un nouveau
 * processus `ts-node` (même comportement que `npm run seed:*`).
 *
 * Usage (depuis la racine ednov-backend) :
 *   npm.cmd run seed:role-groups-and-interface-pipeline
 *   npm.cmd run seed:role-groups-and-interface-pipeline -- --env=recette
 *
 * Ordre — dépendances et intention :
 *
 * | # | Script | Rôle succinct |
 * |---|--------|----------------|
 * | 1 | run-seed-role-groups | Jeu de `role_groups` (référentiel groupes). |
 * | 2 | run-seed-migrate-role-groups | Migre tutor/volunteer/student vers les bons groupes. |
 * | 3 | run-seed-fix-role-groupings | Corrige regroupements / éléments d’interface liés. |
 * | 4 | run-seed-roles-complete | Bloc métier : groupes init, métadonnées rôles, effets de création, is_system, orphelins, actions IE manquantes, défauts + liaisons professeur. |
 * | 5 | run-seed-fix-is-system-roles | Réaligne les flags système (reprise sûre après le bloc complet). |
 * | 6 | run-seed-fix-role-group-orphan | Recontrôle des rôles sans groupe valide. |
 * | 7 | run-seed-missing-action-ies | S’assure que les actions ont leurs interface_elements. |
 * | 8 | run-seed-professor-defaults | Défauts spécifiques PROFESSOR. |
 * | 9 | run-seed-professor-bindings | Liaisons PROFESSOR. |
 * | 10 | run-seed-roles-interface-elements | IE de l’écran / gestion des rôles. |
 * | 11 | run-seed-roles-rie | `role_interface_elements` pour les rôles (écran rôles). |
 * | 12 | run-seed-tutors-interface-elements | IE tuteurs. |
 * | 13 | run-seed-volunteers-interface-elements | IE bénévoles. |
 * | 14 | run-seed-tutors-volunteers-rie | RIE tuteurs + bénévoles. |
 * | 15 | run-seed-update-system-roles-styles | Styles (icônes / couleurs) rôles système. |
 * | 16 | run-seed-roles-styles-v2 | Passage branding v2 sur l’ensemble des rôles. |
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const BACKEND_ROOT = join(__dirname, '../../..');
const TS_NODE = join(BACKEND_ROOT, 'node_modules/ts-node/dist/bin.js');

/** Réinjecte `--env=…` et tout argument après `--` vers chaque étape enfant. */
function cliArgsForChildren(): string[] {
  const dd = process.argv.indexOf('--');
  if (dd !== -1) {
    return process.argv.slice(dd + 1);
  }
  const pipeIdx = process.argv.findIndex((a) =>
    a.includes('run-seed-role-groups-and-interface-pipeline'),
  );
  if (pipeIdx !== -1) {
    return process.argv.slice(pipeIdx + 1);
  }
  return process.argv
    .slice(2)
    .filter((a) => a.startsWith('--') && !a.includes('inspect') && !a.includes('expose'));
}

const CHILD_EXTRA_ARGS = cliArgsForChildren();

const STEPS: string[] = [
  'run-seed-role-groups.ts',
  'run-seed-migrate-role-groups.ts',
  'run-seed-fix-role-groupings.ts',
  'run-seed-roles-complete.ts',
  'run-seed-fix-is-system-roles.ts',
  'run-seed-fix-role-group-orphan.ts',
  'run-seed-missing-action-ies.ts',
  'run-seed-professor-defaults.ts',
  'run-seed-professor-bindings.ts',
  'run-seed-recruiter.ts',
  'run-seed-recruiter-rie.ts',
  'run-seed-professor-volunteers-migration.ts',
  'run-seed-professor-rie.ts',
  'run-seed-roles-access-on-recruiter-professor.ts',
  'run-seed-admin-volunteers-visibility.ts',
  'run-seed-create-options-volunteers.ts',
  'run-seed-fix-tabs-parent-id.ts',
  'run-seed-roles-interface-elements.ts',
  'run-seed-roles-rie.ts',
  'run-seed-tutors-interface-elements.ts',
  'run-seed-volunteers-interface-elements.ts',
  'run-seed-tutors-volunteers-rie.ts',
  'run-seed-update-system-roles-styles.ts',
  'run-seed-roles-styles-v2.ts',
];

function runStep(fileName: string, index: number, total: number): void {
  const scriptPath = join(__dirname, fileName);
  const label = `[${index}/${total}] ${fileName}`;

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(label);
  console.log('═══════════════════════════════════════════════════════════\n');

  const result = spawnSync(
    process.execPath,
    [TS_NODE, '--transpile-only', scriptPath, ...CHILD_EXTRA_ARGS],
    {
      cwd: BACKEND_ROOT,
      stdio: 'inherit',
      env: process.env,
    },
  );

  if (result.error) {
    console.error(`\n❌ Échec du lancement : ${label}`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n❌ Étape en erreur (code ${result.status}) : ${label}`);
    process.exit(result.status ?? 1);
  }

  console.log(`\n✅ Terminé : ${label}`);
}

(async () => {
  console.log('🚀 Pipeline role_groups + rôles + interface (24 étapes)\n');
  console.log(`📁 Racine backend : ${BACKEND_ROOT}`);

  const total = STEPS.length;
  STEPS.forEach((file, i) => runStep(file, i + 1, total));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎉 Pipeline terminé avec succès');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(0);
})();
