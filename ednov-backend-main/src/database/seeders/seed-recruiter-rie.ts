import { DataSource } from 'typeorm';

/**
 * Seeder pour les bindings role_interface_elements du rôle RECRUTEUR
 *
 * Accès RECRUTEUR:
 * ✅ Voir séances
 * ✅ Voir comptes rendus
 * ✅ Créer/modifier/supprimer tuteurs
 * ✅ Créer/modifier/supprimer VSC
 * ✅ Créer/modifier comptes recruteurs
 * ✅ Exporter listes (usagers, utilisateurs, séances, CR)
 *
 * ❌ Pas d'accès aux établissements, classes, spécialités, salles
 * ❌ Pas de création/modification de séances
 * ❌ Pas de rédaction/validation de CR
 * ❌ Pas de gestion des élèves
 * ❌ Pas de gestion des rapports VSC
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRecruiterRIE(ds: DataSource): Promise<void> {
  console.log('🔐 Seeding RECRUTEUR role interface elements...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // Accès sur l'interface admins
    const adminBindings = [
      // Tab recruteur
      { interface: 'admins', elementId: 'tab-recruiter', visible: true, order: 4 },
      // Actions de base sur l'interface admins
      { interface: 'admins', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'admins', elementId: 'action-export-excel', visible: true, order: 0 },
      // Création/édition de recruteurs
      { interface: 'admins', elementId: 'option-create-recruiter', visible: true, order: 0 },
      { interface: 'admins', elementId: 'option-edit-recruiter', visible: true, order: 0 },
      // Filtres
      { interface: 'admins', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'admins', elementId: 'filter-dates', visible: true, order: 1 },
    ];

    // Accès sur l'interface tutors
    const tutorBindings = [
      { interface: 'tutors', elementId: 'action-create', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'action-edit-row', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'action-delete-row', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'action-export-excel', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'filter-matiere', visible: true, order: 1 },
      { interface: 'tutors', elementId: 'filter-dates', visible: true, order: 2 },
    ];

    // Accès sur l'interface volunteers
    const volunteerBindings = [
      { interface: 'volunteers', elementId: 'action-create', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'action-edit-row', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'action-delete-row', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'action-export-excel', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'filter-matiere', visible: true, order: 1 },
      { interface: 'volunteers', elementId: 'filter-dates', visible: true, order: 2 },
    ];

    // Accès sur l'interface sessions (lecture seule)
    const sessionBindings = [
      { interface: 'sessions', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'sessions', elementId: 'action-export-excel', visible: true, order: 0 },
      { interface: 'sessions', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'sessions', elementId: 'filter-dates', visible: true, order: 1 },
    ];

    // Accès sur l'interface reports (lecture seule)
    const reportBindings = [
      { interface: 'reports', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'reports', elementId: 'action-export-excel', visible: true, order: 0 },
      { interface: 'reports', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'reports', elementId: 'filter-dates', visible: true, order: 1 },
    ];

    const allBindings = [
      ...adminBindings,
      ...tutorBindings,
      ...volunteerBindings,
      ...sessionBindings,
      ...reportBindings,
    ];

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const binding of allBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $4::boolean,
          $5::integer,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $3::varchar
          AND ie.interface_name = $2::varchar
          AND ie.deleted_at IS NULL
        WHERE r.code = 'recruiter'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.interface, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) {
        totalCreated++;
      } else {
        totalSkipped++;
      }
    }

    console.log(
      `   ✓ RIE créés: ${totalCreated}, ignorés (déjà existants): ${totalSkipped}`,
    );

    // Accès au menu sidebar
    const sidebarBindings = [
      { interface: 'sidebar', elementId: 'menu-admins', visible: true, order: 1 },
      { interface: 'sidebar', elementId: 'menu-tutors', visible: true, order: 2 },
      { interface: 'sidebar', elementId: 'menu-volunteers', visible: true, order: 3 },
      { interface: 'sidebar', elementId: 'menu-sessions', visible: true, order: 4 },
      { interface: 'sidebar', elementId: 'menu-reports', visible: true, order: 5 },
    ];

    let sidebarCreated = 0;
    for (const binding of sidebarBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $4::boolean,
          $5::integer,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $3::varchar
          AND ie.interface_name = $2::varchar
          AND ie.deleted_at IS NULL
        WHERE r.code = 'recruiter'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.interface, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) {
        sidebarCreated++;
      }
    }

    console.log(`   ✓ Menus sidebar: ${sidebarCreated} créés`);

    console.log(`✅ RIE RECRUTEUR seedés avec succès`);
  } catch (error) {
    console.error('❌ Erreur lors du seeding des RIE RECRUTEUR:', error);
    throw error;
  }
}
