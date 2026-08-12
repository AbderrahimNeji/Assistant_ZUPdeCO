import { DataSource } from 'typeorm';

/**
 * Seeder pour corriger la visibilité des collaborateurs pour le rôle COORDINATEUR
 *
 * Spécifications :
 * - Le coordinateur NE PEUT PAS créer/supprimer des collaborateurs
 * - Il voit les coordinateurs des mêmes établissements (same_establishment)
 * - Il voit tous les recruteurs de la plateforme (unrestricted)
 * - Il garde les autres accès: filtres, export, view
 */
export async function seedCoordinatorCollaboratorsVisibility(ds: DataSource): Promise<void> {
  console.log('🔧 Correction des droits du coordinateur...\n');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';
  const coordinatorRoleId = 'bb9a001f-4090-42d8-9a0f-5dcbfcb4657a';

  // 1. Supprimer UNIQUEMENT action-create et action-delete-row
  console.log('Étape 1: Suppression des actions interdites...');
  
  await ds.query(
    `DELETE FROM role_interface_elements
     WHERE role_id = $1
       AND element_id IN (
         SELECT id FROM interface_elements
         WHERE element_id IN ('action-create', 'action-delete-row')
           AND interface_name = 'admins'
           AND company_id = $2
       )`,
    [coordinatorRoleId, companyId],
  );

  console.log('✓ Actions create/delete retirées\n');

  // 2. Réattribuer les accès corrects s'ils ont été supprimés par erreur
  console.log('Étape 2: Vérification et ajout des accès nécessaires...');

  const requiredElements = [
    { elementId: 'tab-coordinator', visibilityScope: { scope: 'same_establishment', relations: ['establishment'], targetRoleCode: 'coordinator' }, order: 2, visible: true },
    { elementId: 'tab-recruiter', visibilityScope: { scope: 'unrestricted' }, order: 4, visible: true },
    { elementId: 'action-view-row', visibilityScope: null, order: 0, visible: true },
    { elementId: 'action-export-excel', visibilityScope: null, order: 0, visible: true },
    { elementId: 'filter-dates', visibilityScope: null, order: 0, visible: true },
    { elementId: 'filter-etablissement', visibilityScope: null, order: 0, visible: true },
    { elementId: 'filter-roles', visibilityScope: null, order: 0, visible: true },
    { elementId: 'filter-statut', visibilityScope: null, order: 0, visible: true },
  ];

  for (const elem of requiredElements) {
    await ds.query(
      `INSERT INTO role_interface_elements (
         company_id, role_id, element_id, visible, "order", visibility_scope, created_at, updated_at
       )
       SELECT $1, $2, ie.id, $3, $4, $5, now(), now()
       FROM interface_elements ie
       WHERE ie.element_id = $6
         AND ie.interface_name = 'admins'
         AND ie.company_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM role_interface_elements rie
           WHERE rie.role_id = $2 AND rie.element_id = ie.id
         )
       ON CONFLICT DO NOTHING`,
      [
        companyId,
        coordinatorRoleId,
        elem.visible,
        elem.order,
        elem.visibilityScope ? JSON.stringify(elem.visibilityScope) : null,
        elem.elementId,
      ],
    );
  }

  console.log('✓ Accès nécessaires restaurés\n');

  // 3. Mise à jour des visibility_scope pour les tabs existants
  console.log('Étape 3: Mise à jour des visibility_scope...');

  await ds.query(
    `UPDATE role_interface_elements rie
     SET visibility_scope = '{"scope":"same_establishment","relations":["establishment"],"targetRoleCode":"coordinator"}'::jsonb,
         updated_at = now()
     FROM interface_elements ie
     WHERE rie.element_id = ie.id
       AND rie.role_id = $1
       AND ie.element_id = 'tab-coordinator'
       AND ie.interface_name = 'admins'`,
    [coordinatorRoleId],
  );

  await ds.query(
    `UPDATE role_interface_elements rie
     SET visibility_scope = '{"scope":"unrestricted"}'::jsonb,
         updated_at = now()
     FROM interface_elements ie
     WHERE rie.element_id = ie.id
       AND rie.role_id = $1
       AND ie.element_id = 'tab-recruiter'
       AND ie.interface_name = 'admins'`,
    [coordinatorRoleId],
  );

  console.log('✓ Visibility scopes mis à jour\n');
  console.log('✅ Terminé - Le coordinateur a les bons accès\n');
}
