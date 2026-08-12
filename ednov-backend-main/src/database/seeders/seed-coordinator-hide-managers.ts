import { DataSource } from 'typeorm';

/**
 * Seeder pour supprimer au coordinateur le droit de voir les managers
 *
 * Spécifications :
 * - Le coordinateur NE PEUT PAS voir l'onglet manager
 * - Le coordinateur NE PEUT PAS créer/éditer des managers
 * - Supprime tous les éléments d'interface liés aux managers pour le rôle coordinator
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedCoordinatorHideManagers(ds: DataSource): Promise<void> {
  console.log('🔧 Suppression des droits coordinator sur les managers...\n');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';
  const coordinatorRoleId = 'bb9a001f-4090-42d8-9a0f-5dcbfcb4657a';

  try {
    // 1. Supprimer l'accès au tab-manager
    console.log('Étape 1: Suppression du tab-manager...');
    const tabResult = await ds.query(
      `DELETE FROM role_interface_elements
       WHERE role_id = $1
         AND element_id IN (
           SELECT id FROM interface_elements
           WHERE element_id = 'tab-manager'
             AND interface_name = 'admins'
             AND company_id = $2
         )
       RETURNING id`,
      [coordinatorRoleId, companyId],
    );

    if (tabResult.length > 0) {
      console.log(`   ✓ Tab manager supprimé: ${tabResult.length} entrée(s)`);
    } else {
      console.log(`   ⚠ Tab manager déjà absent pour coordinator`);
    }

    // 2. Supprimer l'accès aux actions manager (create, edit, etc.)
    console.log('Étape 2: Suppression des actions manager...');
    const actionsResult = await ds.query(
      `DELETE FROM role_interface_elements
       WHERE role_id = $1
         AND element_id IN (
           SELECT id FROM interface_elements
           WHERE element_id LIKE '%manager%'
             AND interface_name = 'admins'
             AND company_id = $2
             AND element_type = 'action'
         )
       RETURNING id`,
      [coordinatorRoleId, companyId],
    );

    if (actionsResult.length > 0) {
      console.log(`   ✓ Actions manager supprimées: ${actionsResult.length} entrée(s)`);
    } else {
      console.log(`   ⚠ Actions manager déjà absentes pour coordinator`);
    }

    // 3. Vérification finale
    console.log('\nÉtape 3: Vérification...');
    const remainingResult = await ds.query(
      `SELECT COUNT(*) as count
       FROM role_interface_elements rie
       JOIN interface_elements ie ON rie.element_id = ie.id
       WHERE rie.role_id = $1
         AND ie.element_id LIKE '%manager%'
         AND ie.interface_name = 'admins'`,
      [coordinatorRoleId],
    );

    const remaining = parseInt(remainingResult[0].count, 10);
    if (remaining === 0) {
      console.log('   ✓ Vérification OK: aucun accès manager restant pour coordinator');
    } else {
      console.warn(`   ⚠ Attention: ${remaining} accès manager restants pour coordinator`);
    }

    console.log('\n✅ Terminé - Le coordinateur ne peut plus voir les managers\n');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des droits coordinator:', error);
    throw error;
  }
}
