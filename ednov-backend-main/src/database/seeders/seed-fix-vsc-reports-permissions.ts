import { DataSource } from 'typeorm';

/**
 * Fix: Correction des permissions sur les rapports VSC
 * 
 * Problèmes corrigés:
 * 1. VSC ne peut plus valider les rapports (retrait action-validate)
 * 2. Coordinator ne peut plus éditer (retrait action-edit-row) - seul VSC peut éditer
 * 3. Coordinator peut voir menu séances (visible: true)
 * 4-6. Masquer bouton "Créer un compte rendu" pour admin/manager/coordinator (interface reports)
 */
export async function seedFixVscReportsPermissions(dataSource: DataSource): Promise<void> {
  console.log('🔧 [SEED] Correction des permissions rapports VSC...');
  
  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  // 1. Retirer action-validate pour le rôle volunteer dans vsc-reports
  console.log('   → Retrait de action-validate pour volunteer...');
  const removeVolunteerValidate = await dataSource.query(
    `
    DELETE FROM role_interface_elements rie
    USING roles r, interface_elements ie
    WHERE rie.role_id = r.id
      AND rie.element_id = ie.id
      AND r.code = 'volunteer'
      AND r.company_id = $1::uuid
      AND ie.element_id = 'action-validate'
      AND ie.interface_name = 'vsc-reports'
      AND ie.company_id = $1::uuid
    RETURNING rie.id
    `,
    [companyId],
  );
  console.log(`   ✓ ${removeVolunteerValidate.length} RIE supprimé(s) (volunteer cannot validate)`);

  // 2. Retirer action-edit-row pour le rôle coordinator dans vsc-reports
  console.log('   → Retrait de action-edit-row pour coordinator...');
  const removeCoordinatorEdit = await dataSource.query(
    `
    DELETE FROM role_interface_elements rie
    USING roles r, interface_elements ie
    WHERE rie.role_id = r.id
      AND rie.element_id = ie.id
      AND r.code = 'coordinator'
      AND r.company_id = $1::uuid
      AND ie.element_id = 'action-edit-row'
      AND ie.interface_name = 'vsc-reports'
      AND ie.company_id = $1::uuid
    RETURNING rie.id
    `,
    [companyId],
  );
  console.log(`   ✓ ${removeCoordinatorEdit.length} RIE supprimé(s) (coordinator cannot edit)`);

  // 3. Afficher menu-sessions pour coordinator
  console.log('   → Activation menu-sessions pour coordinator...');
  const showCoordinatorSessions = await dataSource.query(
    `
    UPDATE role_interface_elements rie
    SET visible = true, updated_at = now()
    FROM roles r, interface_elements ie
    WHERE rie.role_id = r.id
      AND rie.element_id = ie.id
      AND r.code = 'coordinator'
      AND r.company_id = $1::uuid
      AND ie.element_id = 'menu-sessions'
      AND ie.interface_name = 'sidebar'
      AND ie.company_id = $1::uuid
    RETURNING rie.id
    `,
    [companyId],
  );
  console.log(`   ✓ ${showCoordinatorSessions.length} RIE mis à jour (menu-sessions visible)`);

  // 4-6. Masquer action-create (interface reports) pour admin, manager, coordinator
  console.log('   → Masquage bouton "Créer un compte rendu" pour admin/manager/coordinator...');
  const hideCreateReport = await dataSource.query(
    `
    UPDATE role_interface_elements rie
    SET visible = false, updated_at = now()
    FROM roles r, interface_elements ie
    WHERE rie.role_id = r.id
      AND rie.element_id = ie.id
      AND r.code IN ('admin', 'manager', 'coordinator')
      AND r.company_id = $1::uuid
      AND ie.element_id = 'action-create'
      AND ie.interface_name = 'reports'
      AND ie.company_id = $1::uuid
    RETURNING rie.id
    `,
    [companyId],
  );
  console.log(`   ✓ ${hideCreateReport.length} RIE mis à jour (action-create masqué sur reports)`);

  const total =
    removeVolunteerValidate.length +
    removeCoordinatorEdit.length +
    showCoordinatorSessions.length +
    hideCreateReport.length;

  console.log(`✅ Fix terminé: ${total} RIE modifiés/supprimés`);
  console.log('');
  console.log('📋 Résumé des changements:');
  console.log('   • VSC ne peut plus valider les rapports');
  console.log('   • Coordinator ne peut plus éditer les rapports VSC (seul VSC peut éditer)');
  console.log('   • Coordinator peut maintenant voir le menu séances');
  console.log('   • Bouton "Créer un compte rendu" masqué pour admin/manager/coordinator');
}
