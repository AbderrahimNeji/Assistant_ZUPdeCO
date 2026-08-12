import { DataSource } from 'typeorm';

/**
 * Seeder pour les bindings role_interface_elements du rôle PROFESSOR
 *
 * Accès PROFESSOR (limité à ses établissements d'affectation):
 * ✅ Créer classes/spécialités/salles dans ses établissements
 * ✅ Créer/modifier ses séances (où il est professeur)
 * ✅ Rédiger/modifier/voir CR sur ses séances
 * ✅ Créer/modifier élèves
 * ✅ Créer/modifier/supprimer tuteurs
 * ✅ Créer/modifier VSC
 *
 * ❌ Pas de validation des CR
 * ❌ Pas de création/modification de comptes utilisateurs
 * ❌ Pas de suppression de VSC
 * ❌ Pas d'export de données
 * ❌ Pas de validation des rapports VSC
 *
 * Scope: same_establishment (périmètre limité à ses affectations)
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedProfessorRIE(ds: DataSource): Promise<void> {
  console.log('🔐 Seeding PROFESSOR role interface elements...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // Scope pour limiter aux établissements d'affectation
    const sameEstablishmentScope = JSON.stringify({
      relations: ['same_establishment'],
      logic: 'AND',
    });

    // Accès sur l'interface volunteers
    const volunteerBindings = [
      { interface: 'volunteers', elementId: 'tab-professor', visible: true, order: 2 },
      { interface: 'volunteers', elementId: 'action-create', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'action-edit-row', visible: true, order: 0 },
      {
        interface: 'volunteers',
        elementId: 'option-create-professor',
        visible: true,
        order: 0,
      },
      {
        interface: 'volunteers',
        elementId: 'option-edit-professor',
        visible: true,
        order: 0,
      },
      { interface: 'volunteers', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'volunteers', elementId: 'filter-matiere', visible: true, order: 1 },
      { interface: 'volunteers', elementId: 'filter-dates', visible: true, order: 2 },
    ];

    // Accès sur l'interface tutors (création/modification/suppression)
    const tutorBindings = [
      { interface: 'tutors', elementId: 'action-create', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'action-edit-row', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'action-delete-row', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'tutors', elementId: 'filter-matiere', visible: true, order: 1 },
      { interface: 'tutors', elementId: 'filter-dates', visible: true, order: 2 },
    ];

    // Accès sur l'interface students (création/modification)
    const studentBindings = [
      { interface: 'students', elementId: 'action-create', visible: true, order: 0 },
      { interface: 'students', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'students', elementId: 'action-edit-row', visible: true, order: 0 },
      { interface: 'students', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'students', elementId: 'filter-niveau', visible: true, order: 1 },
      { interface: 'students', elementId: 'filter-dates', visible: true, order: 2 },
    ];

    // Accès sur l'interface sessions (création/modification de SES séances)
    const sessionBindings = [
      { interface: 'sessions', elementId: 'action-create', visible: true, order: 0 },
      { interface: 'sessions', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'sessions', elementId: 'action-edit-row', visible: true, order: 0 },
      { interface: 'sessions', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'sessions', elementId: 'filter-dates', visible: true, order: 1 },
      {
        interface: 'sessions',
        elementId: 'filter-etablissement',
        visible: true,
        order: 2,
      },
    ];

    // Accès sur l'interface reports (rédaction/modification, pas validation)
    const reportBindings = [
      { interface: 'reports', elementId: 'action-create', visible: true, order: 0 },
      { interface: 'reports', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'reports', elementId: 'action-edit-row', visible: true, order: 0 },
      { interface: 'reports', elementId: 'filter-statut', visible: true, order: 0 },
      { interface: 'reports', elementId: 'filter-dates', visible: true, order: 1 },
    ];

    // Accès sur l'interface establishments (lecture + création classes/salles)
    const establishmentBindings = [
      {
        interface: 'establishments',
        elementId: 'action-view-row',
        visible: true,
        order: 0,
      },
      { interface: 'establishments', elementId: 'filter-statut', visible: true, order: 0 },
    ];

    // Accès sur l'interface specialties (création dans ses établissements)
    const specialtyBindings = [
      { interface: 'specialties', elementId: 'action-create', visible: true, order: 0 },
      { interface: 'specialties', elementId: 'action-view-row', visible: true, order: 0 },
      { interface: 'specialties', elementId: 'action-edit-row', visible: true, order: 0 },
    ];

    const allBindings = [
      ...volunteerBindings,
      ...tutorBindings,
      ...studentBindings,
      ...sessionBindings,
      ...reportBindings,
      ...establishmentBindings,
      ...specialtyBindings,
    ];

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const binding of allBindings) {
      // Pour les actions sensibles, on ajoute le scope same_establishment
      const needsScope = [
        'action-create',
        'action-edit-row',
        'action-delete-row',
        'action-view-row',
      ].includes(binding.elementId);

      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          visibility_scope,
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $4::boolean,
          $5::integer,
          $6::jsonb,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $3::varchar
          AND ie.interface_name = $2::varchar
          AND ie.deleted_at IS NULL
        WHERE r.code = 'PROFESSOR'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [
          companyId,
          binding.interface,
          binding.elementId,
          binding.visible,
          binding.order,
          needsScope ? sameEstablishmentScope : null,
        ],
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
      { interface: 'sidebar', elementId: 'menu-volunteers', visible: true, order: 1 },
      { interface: 'sidebar', elementId: 'menu-tutors', visible: true, order: 2 },
      { interface: 'sidebar', elementId: 'menu-students', visible: true, order: 3 },
      { interface: 'sidebar', elementId: 'menu-sessions', visible: true, order: 4 },
      { interface: 'sidebar', elementId: 'menu-reports', visible: true, order: 5 },
      {
        interface: 'sidebar',
        elementId: 'menu-establishments',
        visible: true,
        order: 6,
      },
      { interface: 'sidebar', elementId: 'menu-specialties', visible: true, order: 7 },
      { interface: 'sidebar', elementId: 'menu-dashboard', visible: true, order: 0 },
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
        WHERE r.code = 'PROFESSOR'
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

    console.log(`✅ RIE PROFESSOR seedés avec succès`);
  } catch (error) {
    console.error('❌ Erreur lors du seeding des RIE PROFESSOR:', error);
    throw error;
  }
}
