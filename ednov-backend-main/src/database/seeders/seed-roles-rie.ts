import { DataSource } from 'typeorm';

/**
 * Seeds role_interface_elements for the roles interface.
 * Links admin, coordinator, and manager roles to the roles interface elements created by seed-roles-interface-elements.
 *
 * Access matrix:
 * - admin: all actions + all filters + menu-roles
 * - coordinator: view, export + all filters + menu-roles
 * - manager: view, export + all filters + menu-roles
 */
export async function seedRolesRie(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding role_interface_elements for roles interface...');

  try {
    // Get all company IDs
    const companies = await ds.query<Array<{ id: string }>>(
      `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at`,
    );

    if (companies.length === 0) {
      console.log('⚠️  No companies found - skipping roles RIE seed');
      return;
    }

    console.log(`   Found ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`);

    // Define access matrix: role code -> element IDs that role has access to
    const accessMatrix: Record<string, string[]> = {
      admin: [
        'action-create',
        'action-view-row',
        'action-edit-row',
        'action-delete-row',
        'action-export-excel',
        'filter-role-groups',
        'filter-statut',
        'filter-modes',
        'filter-hierarchy',
        'filter-search',
        'menu-roles',
      ],
      coordinator: [
        'action-view-row',
        'action-export-excel',
        'filter-role-groups',
        'filter-statut',
        'filter-modes',
        'filter-hierarchy',
        'filter-search',
        'menu-roles',
      ],
      manager: [
        'action-view-row',
        'action-export-excel',
        'filter-role-groups',
        'filter-statut',
        'filter-modes',
        'filter-hierarchy',
        'filter-search',
        'menu-roles',
      ],
    };

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const company of companies) {
      // Get role IDs for this company
      const roles = await ds.query<Array<{ id: string; code: string }>>(
        `SELECT id, code FROM roles WHERE company_id = $1::uuid AND code IN ('admin', 'coordinator', 'manager') AND deleted_at IS NULL`,
        [company.id],
      );

      if (roles.length === 0) {
        console.log(`⚠️  No admin/coordinator/manager roles found for company ${company.id}`);
        continue;
      }

      for (const role of roles) {
        const elementIds = accessMatrix[role.code] || [];

        for (const elementId of elementIds) {
          // Get interface_element ID
          const ieResult = await ds.query<Array<{ id: string }>>(
            `SELECT id FROM interface_elements
             WHERE company_id = $1::uuid
             AND ((interface_name = 'roles' AND element_id = $2::varchar)
                  OR (interface_name = 'sidebar' AND element_id = $2::varchar))
             AND deleted_at IS NULL
             LIMIT 1`,
            [company.id, elementId],
          );

          if (ieResult.length === 0) {
            console.log(
              `⚠️  Element ${elementId} not found for company ${company.id} - skipping`,
            );
            continue;
          }

          const interfaceElementId = ieResult[0].id;

          // Insert role_interface_element
          const result = await ds.query(
            `INSERT INTO role_interface_elements (
              id, company_id, role_id, element_id, visibility_scope, created_at, updated_at
            )
            SELECT gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, '{}'::jsonb, now(), now()
            WHERE NOT EXISTS (
              SELECT 1 FROM role_interface_elements
              WHERE company_id = $1 AND role_id = $2 AND element_id = $3
            )
            RETURNING id`,
            [company.id, role.id, interfaceElementId],
          );

          if (result.length > 0) {
            totalInserted++;
          } else {
            totalSkipped++;
          }
        }
      }
    }

    console.log(
      `✅ Role interface elements bindings seeded: ${totalInserted} inserted, ${totalSkipped} skipped`,
    );
  } catch (error) {
    console.error('❌ Error seeding roles RIE:', error);
    throw error;
  }
}
