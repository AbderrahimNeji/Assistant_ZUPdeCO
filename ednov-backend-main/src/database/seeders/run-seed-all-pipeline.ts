import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const BACKEND_ROOT = join(__dirname, '../../..');
const TS_NODE = join(BACKEND_ROOT, 'node_modules/ts-node/dist/bin.js');

function cliArgsForChildren(): string[] {
  const dd = process.argv.indexOf('--');
  if (dd !== -1) return process.argv.slice(dd + 1);
  return [];
}

const CHILD_EXTRA_ARGS = cliArgsForChildren();

/** Exécuté en inline dans ce fichier — pas de `run-seed-*.ts` séparé (pas de script npm dédié). */
const PIPELINE_INLINE_HIDE_ACTIVITIES = '__PIPELINE_INLINE_HIDE_ACTIVITIES__';
const PIPELINE_INLINE_COORDINATOR_VISIBILITY = '__PIPELINE_INLINE_COORDINATOR_VISIBILITY__';

/**
 * Pipeline complet — tous les seeders dans l'ordre chronologique / logique.
 *
 * Ordre et raisonnement :
 *
 * Phase 1 — Groupes de rôles (fondation)
 *   1.  run-seed-role-groups               : crée les 5 role_groups par défaut par company
 *   2.  run-seed-migrate-role-groups        : migre coordinator/manager/PROFESSOR/tutor/volunteer/student
 *                                             vers les bons group codes
 *   3.  run-seed-fix-role-groupings         : corrige les regroupements et IE liées
 *   4.  run-seed-fix-role-group-orphan      : corrige les rôles sans groupe valide
 *   5.  run-seed-fix-is-system-roles        : réaligne les flags is_system
 *
 * Phase 2 — Interface éléments rôles + styles
 *   6.  run-seed-roles-interface-elements   : crée les IE (actions, filtres, menu-roles) pour 'roles'
 *   7.  run-seed-roles-rie                  : lie admin/coordinator/manager aux IE rôles
 *   8.  run-seed-update-system-roles-styles : styles v1 (icônes + couleurs branding)
 *   9.  run-seed-roles-styles-v2            : styles v2 — corrige icônes lucide + tokens couleurs
 *
 * Phase 3 — Tuteurs et bénévoles
 *   10. run-seed-tutors-interface-elements  : IE pour l'interface tuteurs
 *   11. run-seed-volunteers-interface-elements : IE pour l'interface bénévoles
 *   12. run-seed-tutors-volunteers-rie      : lie tutor/volunteer aux IE
 *   13. run-seed-tutors-create-options      : options de création tuteurs
 *   14. run-seed-volunteers-create-options  : options de création bénévoles
 *
 * Phase 4 — Professeur (migration + liaisons)
 *   15. run-seed-professor-volunteers-migration : migre le rôle PROFESSOR (anciens bénévoles)
 *   16. run-seed-professor-defaults         : valeurs par défaut spécifiques PROFESSOR
 *   17. run-seed-professor-rie              : lie PROFESSOR aux IE (tuteurs + bénévoles + sidebar)
 *   18. run-seed-professor-bindings         : liaisons complémentaires du rôle professeur
 *   19. run-seed-tutors-remove-professor    : supprime PROFESSOR de l'interface tuteurs pure
 *
 * Phase 5 — Recruteur (création complète + correctifs)
 *   20. run-seed-recruiter                  : crée le rôle recruteur + IE de base
 *   21. run-seed-recruiter-rie              : lie recruteur aux IE
 *   22. run-seed-recruiter-dashboard        : crée les IE du dashboard recruteur
 *   23. run-seed-recruiter-dashboard-sections : sections du dashboard recruteur
 *   24. run-seed-recruiter-remove-charts    : supprime les graphiques du dashboard
 *   25. run-seed-recruiter-add-professors   : ajoute l'accès professeurs au recruteur
 *   26. run-seed-recruiter-fix-access       : corrige l'accès recruteur après ajouts
 *   27. run-seed-recruiter-fix-tabs         : corrige la structure d'onglets recruteur
 *
 * Phase 6 — Accès rôles croisés + visibilité
 *   28. run-seed-roles-access-on-recruiter-professor : accès rôles sur recruteur/professeur
 *   29. run-seed-admin-volunteers-visibility : visibilité menu admin/bénévoles
 *   30. run-seed-fix-all-tabs-visibility    : corrige la visibilité de tous les onglets
 *   31. coordinator-collaborators-visibility (inline dans run-seed-all-pipeline.ts)
 *   32. hide-activities + filtres displayed (inline dans run-seed-all-pipeline.ts)
 *
 * Phase 7 — Options bénévoles (correctif post-migration)
 *   33. run-seed-create-options-volunteers  : correctif options bénévoles (post-migration PROFESSOR)
 *
 * Phase 8 — Correctifs structure onglets
 *   34. run-seed-fix-tabs-parent-id         : corrige les parent_id des onglets
 *   35. run-seed-fix-tabs-parent-final      : correction finale des parents d'onglets
 *   36. run-seed-fix-menu-admins-volunteers-rie : corrige les RIE menu admins/bénévoles
 *   37. run-seed-rollback-tabs-to-sidebar-parent : rollback onglets vers parent sidebar
 *   37. run-seed-fix-tabs-to-own-interface-menu : corrige onglets vers leur menu d'interface propre
 *
 * Phase 9 — Éléments manquants (passe finale)
 *   38. run-seed-missing-action-ies         : insère les IE d'action manquantes
 */
const STEPS: string[] = [
  // Phase 1 — Groupes de rôles
  'run-seed-role-groups.ts',
  'run-seed-migrate-role-groups.ts',
  'run-seed-fix-role-groupings.ts',
  'run-seed-fix-role-group-orphan.ts',
  'run-seed-fix-is-system-roles.ts',

  // Phase 2 — Interface éléments rôles + styles
  'run-seed-roles-interface-elements.ts',
  'run-seed-roles-rie.ts',
  'run-seed-update-system-roles-styles.ts',
  'run-seed-roles-styles-v2.ts',

  // Phase 3 — Tuteurs et bénévoles
  'run-seed-tutors-interface-elements.ts',
  'run-seed-volunteers-interface-elements.ts',
  'run-seed-tutors-volunteers-rie.ts',
  'run-seed-tutors-create-options.ts',
  'run-seed-volunteers-create-options.ts',

  // Phase 4 — Professeur
  'run-seed-professor-volunteers-migration.ts',
  'run-seed-professor-defaults.ts',
  'run-seed-professor-rie.ts',
  'run-seed-professor-bindings.ts',
  'run-seed-tutors-remove-professor.ts',

  // Phase 5 — Recruteur
  'run-seed-recruiter.ts',
  'run-seed-recruiter-rie.ts',
  'run-seed-recruiter-dashboard.ts',
  'run-seed-recruiter-dashboard-sections.ts',
  'run-seed-recruiter-remove-charts.ts',
  'run-seed-recruiter-add-professors.ts',
  'run-seed-recruiter-fix-access.ts',
  'run-seed-recruiter-fix-tabs.ts',

  // Phase 6 — Accès rôles croisés + visibilité
  'run-seed-roles-access-on-recruiter-professor.ts',
  'run-seed-admin-volunteers-visibility.ts',
  'run-seed-fix-all-tabs-visibility.ts',
  PIPELINE_INLINE_COORDINATOR_VISIBILITY,
  PIPELINE_INLINE_HIDE_ACTIVITIES,

  // Phase 7 — Options bénévoles correctif
  'run-seed-create-options-volunteers.ts',

  // Phase 8 — Correctifs structure onglets
  'run-seed-fix-tabs-parent-id.ts',
  'run-seed-fix-tabs-parent-final.ts',
  'run-seed-fix-menu-admins-volunteers-rie.ts',
  'run-seed-rollback-tabs-to-sidebar-parent.ts',
  'run-seed-fix-tabs-to-own-interface-menu.ts',

  // Phase 9 — Éléments manquants (passe finale)
  'run-seed-missing-action-ies.ts',
  
  // Phase 10 — Fix final actions volunteer/PROFESSOR
  'run-seed-fix-volunteer-professor-actions.ts',

  // Phase 11 — Alignement complet PROFESSOR ↔ volunteer
  'run-seed-align-professor-volunteer-access.ts',
  
  // Phase 12 — Alignement des accès professor pour coordinator/manager/volunteer
  'run-seed-align-roles-volunteer-professor-access.ts',
  
  // Phase 13 — Pluralisation des labels tabs
  'run-seed-pluralize-admin-tabs.ts',
];

function runStepSpawn(fileName: string, index: number, total: number): void {
  const scriptPath = join(__dirname, fileName);
  const label = `[${index}/${total}] ${fileName}`;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${label}`);
  console.log('─'.repeat(60));

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
    console.error(`\n❌ Étape en erreur (code ${result.status ?? 'null'}) : ${label}`);
    process.exit(result.status ?? 1);
  }

  console.log(`✅ Terminé : ${label}`);
}

async function runCoordinatorVisibilityInline(index: number, total: number): Promise<void> {
  const label = `[${index}/${total}] coordinator-collaborators-visibility (pipeline inline)`;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${label}`);
  console.log('─'.repeat(60));

  const { seederDataSource } = await import('./seeder-datasource');
  const { seedCoordinatorCollaboratorsVisibility } = await import(
    './seed-coordinator-collaborators-visibility'
  );

  try {
    await seederDataSource.initialize();
    await seedCoordinatorCollaboratorsVisibility(seederDataSource);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }

  console.log(`✅ Terminé : ${label}`);
}

async function runHideActivitiesAndFiltersInline(index: number, total: number): Promise<void> {
  const label = `[${index}/${total}] hide-activities-and-set-filters-visible (pipeline inline)`;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${label}`);
  console.log('─'.repeat(60));

  const { seederDataSource } = await import('./seeder-datasource');
  const { seedHideActivitiesAndSetFiltersVisible } = await import(
    './seed-hide-activities-and-set-filters-visible'
  );

  try {
    await seederDataSource.initialize();
    await seedHideActivitiesAndSetFiltersVisible(seederDataSource);
  } finally {
    if (seederDataSource.isInitialized) await seederDataSource.destroy();
  }

  console.log(`✅ Terminé : ${label}`);
}

async function main(): Promise<void> {
  const total = STEPS.length;

  console.log('═'.repeat(60));
  console.log(`🚀  Pipeline complet — ${total} seeders`);
  console.log(`📁  Racine backend : ${BACKEND_ROOT}`);
  console.log('═'.repeat(60));

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const stepIndex = i + 1;

    if (step === PIPELINE_INLINE_COORDINATOR_VISIBILITY) {
      await runCoordinatorVisibilityInline(stepIndex, total);
    } else if (step === PIPELINE_INLINE_HIDE_ACTIVITIES) {
      await runHideActivitiesAndFiltersInline(stepIndex, total);
    } else {
      runStepSpawn(step, stepIndex, total);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🎉  Pipeline terminé avec succès (${total} étapes)`);
  console.log('═'.repeat(60) + '\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Pipeline complet — erreur fatale :', err);
  process.exit(1);
});
