import { DataSource } from 'typeorm';

/**
 * Seeder pour corriger la visibilité des éléments de l'interface volunteers pour le rôle admin
 *
 * Problème: Les tabs et menus de l'interface volunteers avaient visible=null pour admin,
 * ce qui les rendait invisibles dans l'interface.
 *
 * Solution: Mettre visible=true pour tous les éléments de l'interface volunteers pour admin.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedAdminVolunteersVisibility(ds: DataSource): Promise<void> {
  console.log('👁️ Fixing admin visibility on volunteers interface...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // 1. Corriger la visibilité du tab-volunteer pour admin
    const tabVolunteerResult = await ds.query(
      `UPDATE role_interface_elements
       SET visible = true,
           "order" = COALESCE("order", 1),
           updated_at = now()
       FROM roles r, interface_elements ie
       WHERE role_interface_elements.role_id = r.id
         AND role_interface_elements.element_id = ie.id
         AND r.code = 'admin'
         AND r.company_id = $1::uuid
         AND ie.element_id = 'tab-volunteer'
         AND ie.interface_name = 'volunteers'
         AND (role_interface_elements.visible IS NULL OR role_interface_elements.visible = false)
       RETURNING role_interface_elements.id`,
      [companyId],
    );

    if (tabVolunteerResult.length > 0) {
      console.log(`   ✓ Tab volunteer visible pour admin: ${tabVolunteerResult.length} corrigé(s)`);
    } else {
      console.log(`   ⚠ Tab volunteer déjà visible pour admin`);
    }

    // 2. Corriger la visibilité du tab-professor pour admin
    const tabProfessorResult = await ds.query(
      `UPDATE role_interface_elements
       SET visible = true,
           "order" = COALESCE("order", 2),
           updated_at = now()
       FROM roles r, interface_elements ie
       WHERE role_interface_elements.role_id = r.id
         AND role_interface_elements.element_id = ie.id
         AND r.code = 'admin'
         AND r.company_id = $1::uuid
         AND ie.element_id = 'tab-professor'
         AND ie.interface_name = 'volunteers'
         AND (role_interface_elements.visible IS NULL OR role_interface_elements.visible = false)
       RETURNING role_interface_elements.id`,
      [companyId],
    );

    if (tabProfessorResult.length > 0) {
      console.log(`   ✓ Tab professor visible pour admin: ${tabProfessorResult.length} corrigé(s)`);
    } else {
      console.log(`   ⚠ Tab professor déjà visible pour admin`);
    }

    // 3. Corriger la visibilité du menu-volunteers pour admin
    const menuResult = await ds.query(
      `UPDATE role_interface_elements
       SET visible = true,
           updated_at = now()
       FROM roles r, interface_elements ie
       WHERE role_interface_elements.role_id = r.id
         AND role_interface_elements.element_id = ie.id
         AND r.code = 'admin'
         AND r.company_id = $1::uuid
         AND ie.element_id = 'menu-volunteers'
         AND ie.interface_name = 'volunteers'
         AND (role_interface_elements.visible IS NULL OR role_interface_elements.visible = false)
       RETURNING role_interface_elements.id`,
      [companyId],
    );

    if (menuResult.length > 0) {
      console.log(`   ✓ Menu volunteers visible pour admin: ${menuResult.length} corrigé(s)`);
    } else {
      console.log(`   ⚠ Menu volunteers déjà visible pour admin`);
    }

    // 4. S'assurer que tous les autres éléments de volunteers sont visibles pour admin
    const allElementsResult = await ds.query(
      `UPDATE role_interface_elements
       SET visible = true,
           updated_at = now()
       FROM roles r, interface_elements ie
       WHERE role_interface_elements.role_id = r.id
         AND role_interface_elements.element_id = ie.id
         AND r.code = 'admin'
         AND r.company_id = $1::uuid
         AND ie.interface_name = 'volunteers'
         AND ie.element_type IN ('action', 'tab', 'menu')
         AND (role_interface_elements.visible IS NULL OR role_interface_elements.visible = false)
       RETURNING role_interface_elements.id`,
      [companyId],
    );

    if (allElementsResult.length > 0) {
      console.log(`   ✓ Autres éléments corrigés: ${allElementsResult.length}`);
    }

    console.log(`✅ Visibilité admin sur volunteers corrigée`);
  } catch (error) {
    console.error('❌ Erreur lors de la correction de la visibilité admin:', error);
    throw error;
  }
}
