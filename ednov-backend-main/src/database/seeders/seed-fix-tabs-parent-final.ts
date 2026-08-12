import { DataSource } from 'typeorm';

/**
 * SEEDER FINAL pour corriger les parent_id des tabs
 * 
 * PROBLÈME:
 * - Les tabs de l'interface 'admins' pointent vers menu-admins dans 'sidebar'
 * - Mais useInterfaceElements('admins') ne charge QUE les éléments de l'interface 'admins'
 * - Donc le parent n'est pas trouvé et les tabs ne s'affichent pas!
 * 
 * SOLUTION:
 * - Tous les tabs doivent pointer vers le menu dans LEUR interface
 * - tab admins → menu-admins dans interface 'admins'
 * - tab volunteers → menu-volunteers dans interface 'volunteers'
 * 
 * Idempotent: safe to run multiple times.
 */
export async function seedFixTabsParentFinal(ds: DataSource): Promise<void> {
  console.log('🔧 FIXING tabs parent_id (FINAL FIX)...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // 1. Trouver menu-admins dans l'interface 'admins'
    const adminsMenuResult = await ds.query(
      `SELECT id FROM interface_elements 
       WHERE element_id = 'menu-admins' 
       AND interface_name = 'admins'
       AND company_id = $1::uuid 
       AND deleted_at IS NULL 
       LIMIT 1`,
      [companyId],
    );

    if (adminsMenuResult.length > 0) {
      const adminsMenuId = adminsMenuResult[0].id;
      console.log(`   ℹ menu-admins (admins interface): ${adminsMenuId}`);

      // Mettre à jour TOUS les tabs admins pour pointer vers ce menu
      const adminsTabsFixed = await ds.query(
        `UPDATE interface_elements
         SET parent_id = $2::uuid,
             updated_at = now()
         WHERE interface_name = 'admins'
           AND element_type = 'tab'
           AND company_id = $1::uuid
           AND deleted_at IS NULL
         RETURNING element_id`,
        [companyId, adminsMenuId],
      );

      console.log(`   ✓ ADMINS: ${adminsTabsFixed.length} tabs corrigés`);
      adminsTabsFixed.forEach(row => console.log(`      - ${row.element_id}`));
    } else {
      console.log('   ⚠ menu-admins introuvable dans interface admins');
    }

    // 2. Trouver menu-volunteers dans l'interface 'volunteers'
    const volunteersMenuResult = await ds.query(
      `SELECT id FROM interface_elements 
       WHERE element_id = 'menu-volunteers' 
       AND interface_name = 'volunteers'
       AND company_id = $1::uuid 
       AND deleted_at IS NULL 
       LIMIT 1`,
      [companyId],
    );

    if (volunteersMenuResult.length > 0) {
      const volunteersMenuId = volunteersMenuResult[0].id;
      console.log(`   ℹ menu-volunteers (volunteers interface): ${volunteersMenuId}`);

      // Mettre à jour TOUS les tabs volunteers pour pointer vers ce menu
      const volunteersTabsFixed = await ds.query(
        `UPDATE interface_elements
         SET parent_id = $2::uuid,
             updated_at = now()
         WHERE interface_name = 'volunteers'
           AND element_type = 'tab'
           AND company_id = $1::uuid
           AND deleted_at IS NULL
         RETURNING element_id`,
        [companyId, volunteersMenuId],
      );

      console.log(`   ✓ VOLUNTEERS: ${volunteersTabsFixed.length} tabs corrigés`);
      volunteersTabsFixed.forEach(row => console.log(`      - ${row.element_id}`));
    } else {
      console.log('   ⚠ menu-volunteers introuvable dans interface volunteers');
    }

    console.log(`\n✅ Tabs parent_id FINAL FIX terminé`);
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}
