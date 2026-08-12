import { DataSource } from 'typeorm';

/**
 * Seeds role creation side effects (tabs, menu items) in interface_elements.
 * Ensures each role has its corresponding tab and menu section elements.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRoleCreationSideEffects(ds: DataSource): Promise<void> {
  console.log('🔗 Seeding role creation side effects (tabs, menus)...');

  // First, get all roles grouped by role_group
  const roles = await ds.query(
    `SELECT id, code, label, role_group, company_id
     FROM roles
     WHERE deleted_at IS NULL
     ORDER BY company_id, role_group, code`,
  );

  if (roles.length === 0) {
    console.log('   ⚠ No roles found');
    return;
  }

  try {
    let totalTabsCreated = 0;
    let totalMenusCreated = 0;

    // Group roles by company and role_group
    const rolesByCompanyAndGroup = new Map<string, typeof roles>();
    
    for (const role of roles) {
      const key = `${role.company_id}:${role.role_group}`;
      if (!rolesByCompanyAndGroup.has(key)) {
        rolesByCompanyAndGroup.set(key, []);
      }
      rolesByCompanyAndGroup.get(key)!.push(role);
    }

    // For each company/group, ensure menu and tabs exist
    for (const [key, groupRoles] of rolesByCompanyAndGroup.entries()) {
      const [companyId, roleGroup] = key.split(':');
      const interfaceName = roleGroup; // Use role_group as interface_name

      // Get first role for group metadata
      const firstRole = groupRoles[0];

      // 1. Ensure menu item exists for this interface
      const menuResult = await ds.query(
        `INSERT INTO interface_elements (
           company_id,
           element_id,
           element_type,
           element_label,
           interface_name,
           group_label,
           parent_id,
           group_order,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
         ON CONFLICT (company_id, element_id, interface_name) DO NOTHING
         RETURNING id`,
        [
          companyId,
          `menu-${interfaceName}`,
          'menu',
          firstRole.label || interfaceName,
          interfaceName,
          interfaceName,
          null,
          10,
        ],
      );

      if (menuResult.length > 0) {
        totalMenusCreated += menuResult.length;
        console.log(`   ✓ Created menu for '${interfaceName}'`);
      }

      // 2. Create tabs for each role in this group
      for (const role of groupRoles) {
        const tabResult = await ds.query(
          `INSERT INTO interface_elements (
             company_id,
             element_id,
             element_type,
             element_label,
             interface_name,
             group_label,
             group_order,
             created_at,
             updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
           ON CONFLICT (company_id, element_id, interface_name) DO NOTHING
           RETURNING id`,
          [
            companyId,
            `tab-${role.code}`,
            'tab',
            role.label,
            interfaceName,
            interfaceName,
            10,
          ],
        );

        if (tabResult.length > 0) {
          totalTabsCreated += tabResult.length;
        }
      }
    }

    console.log(
      `✅ Role creation side effects seeded: ${totalMenusCreated} menus, ${totalTabsCreated} tabs created`,
    );
  } catch (error) {
    console.error('❌ Error seeding role creation side effects:', error);
    throw error;
  }
}
