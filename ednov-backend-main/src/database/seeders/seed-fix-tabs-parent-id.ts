import { DataSource } from 'typeorm';

/**
 * Seeder pour corriger les parent_id des tabs qui pointent vers le mauvais menu
 *
 * Problème:
 * - Il existe menu-admins dans 'sidebar' ET dans 'admins'
 * - Il existe menu-volunteers dans 'sidebar' ET dans 'volunteers'
 * - Les tabs doivent pointer vers le menu dans LEUR interface, pas vers celui de sidebar
 *
 * Solution:
 * - Tous les tabs de l'interface 'admins' doivent pointer vers menu-admins dans 'admins'
 * - Tous les tabs de l'interface 'volunteers' doivent pointer vers menu-volunteers dans 'volunteers'
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedFixTabsParentId(ds: DataSource): Promise<void> {
  console.log('🔧 Fixing tabs parent_id...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // 1. Corriger les tabs admins pour pointer vers menu-admins dans l'interface 'admins'
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

      const adminsTabsResult = await ds.query(
        `UPDATE interface_elements
         SET parent_id = $2::uuid,
             updated_at = now()
         WHERE interface_name = 'admins'
           AND element_type = 'tab'
           AND company_id = $1::uuid
           AND deleted_at IS NULL
           AND (parent_id IS NULL OR parent_id != $2::uuid)
         RETURNING element_id`,
        [companyId, adminsMenuId],
      );

      console.log(`   ✓ Corrigé ${adminsTabsResult.length} tabs admins`);
    } else {
      console.log('   ⚠ Menu admins non trouvé dans interface admins');
    }

    // 2. Corriger les tabs volunteers pour pointer vers menu-volunteers dans l'interface 'volunteers'
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

      const volunteersTabsResult = await ds.query(
        `UPDATE interface_elements
         SET parent_id = $2::uuid,
             updated_at = now()
         WHERE interface_name = 'volunteers'
           AND element_type = 'tab'
           AND company_id = $1::uuid
           AND deleted_at IS NULL
           AND (parent_id IS NULL OR parent_id != $2::uuid)
         RETURNING element_id`,
        [companyId, volunteersMenuId],
      );

      console.log(`   ✓ Corrigé ${volunteersTabsResult.length} tabs volunteers`);
    } else {
      console.log('   ⚠ Menu volunteers non trouvé dans interface volunteers');
    }

    console.log(`✅ Tabs parent_id corrigés`);
  } catch (error) {
    console.error('❌ Erreur lors de la correction des tabs parent_id:', error);
    throw error;
  }
}
