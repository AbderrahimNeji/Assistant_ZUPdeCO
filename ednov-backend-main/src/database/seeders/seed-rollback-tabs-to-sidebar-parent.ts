import { DataSource } from 'typeorm';

/**
 * ROLLBACK: Les tabs doivent pointer vers menu-admins/menu-volunteers du SIDEBAR,
 * pas vers les menus de leur propre interface.
 */
export async function seedRollbackTabsToSidebarParent(dataSource: DataSource): Promise<void> {
  console.log('🔄 [ROLLBACK] Restaurer parent_id des tabs vers menus sidebar...');

  // 1. Récupérer menu-admins du sidebar
  const [menuAdminsSidebar] = await dataSource.query(
    `SELECT id FROM interface_elements WHERE element_id = 'menu-admins' AND interface_name = 'sidebar' LIMIT 1`,
  );

  if (menuAdminsSidebar) {
    const result = await dataSource.query(
      `UPDATE interface_elements 
       SET parent_id = $1, updated_at = NOW()
       WHERE element_id IN ('tab-admin', 'tab-manager', 'tab-coordinator', 'tab-recruiter') 
       AND interface_name = 'admins'`,
      [menuAdminsSidebar.id],
    );
    console.log(`✅ Tabs admins → menu-admins (sidebar)`);
  }

  // 2. Récupérer menu-volunteers du sidebar
  const [menuVolunteersSidebar] = await dataSource.query(
    `SELECT id FROM interface_elements WHERE element_id = 'menu-volunteers' AND interface_name = 'sidebar' LIMIT 1`,
  );

  if (menuVolunteersSidebar) {
    const result = await dataSource.query(
      `UPDATE interface_elements 
       SET parent_id = $1, updated_at = NOW()
       WHERE element_id IN ('tab-volunteer', 'tab-vsc', 'tab-professor') 
       AND interface_name = 'volunteers'`,
      [menuVolunteersSidebar.id],
    );
    console.log(`✅ Tabs volunteers → menu-volunteers (sidebar)`);
  }

  console.log('✅ Rollback terminé');
}
