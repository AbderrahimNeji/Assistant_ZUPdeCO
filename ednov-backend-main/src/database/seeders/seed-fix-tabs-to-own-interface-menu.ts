import { DataSource } from 'typeorm';

/**
 * FIX FINAL: Les tabs doivent pointer vers le menu de leur propre interface
 * (pas vers le menu sidebar d'une autre interface).
 */
export async function seedFixTabsToOwnInterfaceMenu(dataSource: DataSource): Promise<void> {
  console.log('🔧 [FIX] Tabs → menus de leur propre interface...');

  // 1. Tabs admins → menu-admins de l'interface 'admins'
  const [menuAdminsInAdmins] = await dataSource.query(
    `SELECT id FROM interface_elements WHERE element_id = 'menu-admins' AND interface_name = 'admins' LIMIT 1`,
  );

  if (menuAdminsInAdmins) {
    await dataSource.query(
      `UPDATE interface_elements 
       SET parent_id = $1, updated_at = NOW()
       WHERE element_id IN ('tab-admin', 'tab-manager', 'tab-coordinator', 'tab-recruiter') 
       AND interface_name = 'admins'`,
      [menuAdminsInAdmins.id],
    );
    console.log(`✅ Tabs admins → menu-admins (interface admins)`);
  }

  // 2. Tabs volunteers → menu-volunteers de l'interface 'volunteers'
  const [menuVolunteersInVolunteers] = await dataSource.query(
    `SELECT id FROM interface_elements WHERE element_id = 'menu-volunteers' AND interface_name = 'volunteers' LIMIT 1`,
  );

  if (menuVolunteersInVolunteers) {
    await dataSource.query(
      `UPDATE interface_elements 
       SET parent_id = $1, updated_at = NOW()
       WHERE element_id IN ('tab-volunteer', 'tab-vsc', 'tab-professor') 
       AND interface_name = 'volunteers'`,
      [menuVolunteersInVolunteers.id],
    );
    console.log(`✅ Tabs volunteers → menu-volunteers (interface volunteers)`);
  }

  console.log('✅ Fix terminé');
}
