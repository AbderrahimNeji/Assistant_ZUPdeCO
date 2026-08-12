import { DataSource } from 'typeorm';

interface PostItTemplate {
  quarterlyPeriods: number[];
  thematic: string;
  content: string;
}

/**
 * Migrates coordinator post-it templates to assigned_post_it_templates system.
 * Creates 87 templates per company covering T1-T4 + transversal tasks.
 *
 * Steps:
 *  1. Identify active companies and coordinator roles
 *  2. Create assigned_post_it_templates per company (quarterly recurrence)
 *  3. Soft-delete old default post-its (is_default=true, key ~ '^(t1|t2|t3)_')
 *  4. Log coordinator counts for manual provisioning verification
 */
export async function seedMigrateDefaultPostits(ds: DataSource): Promise<void> {
  console.log('🌱 Migrating default post-its to assigned templates...');

  const DEFAULT_POST_IT_TEMPLATES: PostItTemplate[] = [
    // ===== ANCIENNES TÂCHES (30) =====
    
    // Trimestre 1 - Octobre à Décembre
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Convention signée et récupérée',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Contrats volontaires signés',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'tuteur',
      content: 'Organiser et suivre la formation d\'accueil + plateforme',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Première action de visibilité',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Accueil des étudiants (avec référent Devoirs Faits)',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Mise en place et suivi du recrutement élèves (tutorat collectif et tutorat individuel)',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'seances',
      content: 'Plateforme à jour',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Participation CC1 + bilans de chaque élève à envoyer à la direction',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Récupérer les notes des élèves T1 et remplir l\'évaluation finale',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Liste des élèves suivis en tutorat individuel en présentiel',
    },

    // Trimestre 2 - Janvier à Mars
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Mise en place des ateliers culturels',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Mise en place des actions parentalité / bilans téléphoniques',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Deuxième action de visibilité des volontaires',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Bilans des étudiants saisis',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'formation',
      content: 'PSC1 et FCC des volontaires organisées',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Date réunion bilan intermédiaire collège avec direction (et référent Devoirs Faits)',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'seances',
      content: 'Plateforme à jour',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Participation CC2 + bilans de chaque élève à envoyer à la direction',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Récupérer les notes des élèves T2 et remplir l\'évaluation finale',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Liste des élèves en tutorat individuel en présentiel et HomeClasse',
    },

    // Trimestre 3 - Avril à Juin
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Sortie réalisée',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'seances',
      content: 'Plateforme à jour',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Bilans des étudiants saisis',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Participation CC3 + bilans de chaque élève à envoyer à la direction',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Liste des élèves en tutorat individuel en présentiel et HomeClasse',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Date réunion bilan final collège (PPL + PPL adj + CPE)',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'rapport_activite',
      content: 'Rapport d\'activité fait',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Récupérer les notes des élèves T3 et remplir l\'évaluation finale',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Bilan nominatif volontaire fait',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Questionnaires ZUPdeCO renseignés',
    },

    // ===== NOUVELLES TÂCHES (57) =====
    
    // T1 — Sept/Oct/Nov (13 tâches)
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Finaliser la cartographie établissements',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Organiser les réunions de rentrée',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Vérifier les conventions',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'etablissements',
      content: 'Identifier les besoins établissements',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'eleves',
      content: 'Identifier les élèves bénéficiaires',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'matching',
      content: 'Lancer le recrutement bénévoles',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'tuteur',
      content: 'Intégrer les VSC',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'tuteur',
      content: 'Vérifier les dates d\'entrée bénévoles et VSC',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'administration',
      content: 'Planifier les dates de sortie prévisionnelles',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'tuteur',
      content: 'Former bénévoles et VSC',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'seances',
      content: 'Préparer les plannings',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'seances',
      content: 'Lancer les premiers accompagnements',
    },
    {
      quarterlyPeriods: [1],
      thematic: 'seances',
      content: 'Organiser les premiers suivis terrain',
    },

    // T2 — Déc/Jan/Fév (11 tâches)
    {
      quarterlyPeriods: [2],
      thematic: 'seances',
      content: 'Vérifier la régularité des séances',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'seances',
      content: 'Ajuster les plannings',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'matching',
      content: 'Gérer les ruptures bénévoles',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'matching',
      content: 'Faire les remplacements',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'administration',
      content: 'Mettre à jour les dates de sortie si rupture',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'tuteur',
      content: 'Suivre les VSC',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'etablissements',
      content: 'Réaliser les points établissements',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'administration',
      content: 'Corriger les difficultés opérationnelles',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'matching',
      content: 'Consolider les binômes',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'administration',
      content: 'Vérifier les indicateurs intermédiaires',
    },
    {
      quarterlyPeriods: [2],
      thematic: 'administration',
      content: 'Préparer les bilans intermédiaires',
    },

    // T3 — Mar/Avr/Mai (9 tâches)
    {
      quarterlyPeriods: [3],
      thematic: 'seances',
      content: 'Intensifier le suivi qualité',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'administration',
      content: 'Réaliser les enquêtes satisfaction',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Préparer les reconductions',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Prospecter les nouveaux établissements',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'eleves',
      content: 'Organiser les sorties pédagogiques',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'etablissements',
      content: 'Développer les partenariats locaux',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'administration',
      content: 'Consolider les résultats annuels',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'tuteur',
      content: 'Anticiper les sorties VSC de fin d\'année',
    },
    {
      quarterlyPeriods: [3],
      thematic: 'administration',
      content: 'Anticiper les besoins RH N+1',
    },

    // T4 — Juin/Juillet (11 tâches)
    {
      quarterlyPeriods: [4],
      thematic: 'etablissements',
      content: 'Réaliser les bilans établissements',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'tuteur',
      content: 'Réaliser les bilans bénévoles',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'tuteur',
      content: 'Réaliser les bilans VSC',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'administration',
      content: 'Vérifier toutes les dates de sortie',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'administration',
      content: 'Consolider les indicateurs annuels',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'administration',
      content: 'Préparer les reportings financeurs',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'administration',
      content: 'Préparer les projections budgétaires',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'etablissements',
      content: 'Finaliser les reconductions',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'etablissements',
      content: 'Préparer les ouvertures N+1',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'administration',
      content: 'Organiser les passations',
    },
    {
      quarterlyPeriods: [4],
      thematic: 'administration',
      content: 'Clôturer l\'année scolaire',
    },

    // Transversal — toute l'année (13 tâches)
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'autres',
      content: 'Répondre aux urgences terrain',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'administration',
      content: 'Gérer les absences',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'etablissements',
      content: 'Répondre aux établissements',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'tuteur',
      content: 'Répondre aux bénévoles',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'tuteur',
      content: 'Répondre aux VSC',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'administration',
      content: 'Mettre à jour les tableaux de bord',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'administration',
      content: 'Alimenter les CRM',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'administration',
      content: 'Mettre à jour les reportings',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'administration',
      content: 'Suivre les dates d\'entrée et de sortie',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'autres',
      content: 'Faire remonter les alertes',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'administration',
      content: 'Participer aux COPIL / CAP',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'administration',
      content: 'Assurer la communication interne',
    },
    {
      quarterlyPeriods: [1, 2, 3, 4],
      thematic: 'seances',
      content: 'Assurer la qualité pédagogique',
    },
  ];

  try {
    // Phase A — Identifier les entreprises et le rôle coordinateur
    console.log('📋 Phase A: Identifying companies and coordinator roles...');
    const companies = await ds.query<Array<{ company_id: string; coordinator_role_id: string }>>(
      `SELECT c.id AS company_id, r.id AS coordinator_role_id
       FROM companies c
       INNER JOIN roles r ON r.company_id = c.id
         AND r.code = 'coordinator'
         AND r.deleted_at IS NULL
       WHERE c.deleted_at IS NULL`,
    );

    if (companies.length === 0) {
      console.log('⚠️  No companies with coordinator role found - skipping migration');
      return;
    }

    console.log(`   Found ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'} with coordinator role`);

    // Phase B — Créer les assigned_post_it_templates par entreprise
    console.log('📝 Phase B: Creating assigned_post_it_templates...');
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const { company_id, coordinator_role_id } of companies) {
      // Get first admin user for this company (as createdBy)
      const adminUser = await ds.query<Array<{ id: string }>>(
        `SELECT id FROM users
         WHERE company_id = $1 AND deleted_at IS NULL
         ORDER BY created_at LIMIT 1`,
        [company_id],
      );

      if (adminUser.length === 0) {
        console.log(`   ⚠️  No users found for company ${company_id} - skipping`);
        continue;
      }

      const createdById = adminUser[0].id;

      for (const template of DEFAULT_POST_IT_TEMPLATES) {
        const result = await ds.query(
          `INSERT INTO assigned_post_it_templates (
            id, company_id, created_by_id, title, thematic, content,
            color, is_priority, target_role_ids, target_role_code,
            recurrence_type, quarterly_periods, schedule_config, is_active,
            created_at, updated_at
          )
          SELECT
            gen_random_uuid(),
            $1::uuid,
            $2::uuid,
            $3::varchar,
            $4::varchar,
            $5::varchar,
            'blanc-casse',
            true,
            ARRAY[$6::uuid],
            'coordinator',
            CASE WHEN $7::int[] = ARRAY[1,2,3,4] THEN 'annually' ELSE 'quarterly' END,
            CASE WHEN $7::int[] = ARRAY[1,2,3,4] THEN ARRAY[]::int[] ELSE $7::int[] END,
            CASE
              WHEN $7::int[] = ARRAY[1,2,3,4] THEN jsonb_build_object(
                'type', 'civil_year',
                'options', jsonb_build_object('yearScope', 'current_civil_year'),
                'recurrence', jsonb_build_object('mode', 'indefinitely')
              )
              ELSE jsonb_build_object(
                'type', 'quarterly',
                'options', jsonb_build_object(
                  'targetQuarters', to_jsonb($7::int[]),
                  'yearScope', 'current_school_year'
                ),
                'recurrence', jsonb_build_object('mode', 'indefinitely')
              )
            END,
            true,
            now(),
            now()
          WHERE NOT EXISTS (
            SELECT 1 FROM assigned_post_it_templates
            WHERE company_id = $1
              AND target_role_code = 'coordinator'
              AND title = $3
              AND deleted_at IS NULL
          )
          RETURNING id`,
          [
            company_id,
            createdById,
            template.content, // Using content as title
            template.thematic,
            template.content,
            coordinator_role_id,
            template.quarterlyPeriods,
          ],
        );

        if (result.length > 0) {
          totalCreated++;
        } else {
          totalSkipped++;
        }
      }
    }

    console.log(`   ✅ Created ${totalCreated} templates, skipped ${totalSkipped} (already exist)`);

    // Phase C — Soft-delete old default post-its
    console.log('🗑️  Phase C: Soft-deleting old default post-its...');
    const deleteResult = await ds.query(
      `UPDATE post_its
       SET deleted_at = now(), updated_at = now()
       WHERE is_default = true
         AND default_post_it_key ~ '^(t1|t2|t3)_'
         AND deleted_at IS NULL
       RETURNING id`,
    );

    console.log(`   ✅ Soft-deleted ${deleteResult.length} old default post-its`);

    // Phase D — Log coordinator counts for provisioning verification
    console.log('👥 Phase D: Counting active coordinators...');
    const coordinatorCounts = await ds.query<Array<{ company_id: string; count: string }>>(
      `SELECT u.company_id, COUNT(DISTINCT u.id)::text as count
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id AND r.code = 'coordinator' AND r.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
       GROUP BY u.company_id`,
    );

    const totalCoordinators = coordinatorCounts.reduce((sum, row) => sum + parseInt(row.count, 10), 0);
    console.log(`   ℹ️  Total active coordinators: ${totalCoordinators} across ${coordinatorCounts.length} companies`);
    console.log('   ℹ️  Next cron run (assigned-post-its-scheduler) will provision templates for these users');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}
