import { DataSource } from 'typeorm';

/**
 * Seeds interface_elements for the 'roles' interface and menu-roles in sidebar.
 * Creates:
 * - 5 actions (create, view-row, edit-row, delete-row, export-excel)
 * - 5 filters (filter-role-groups, filter-statut, filter-modes, filter-hierarchy, filter-search)
 * - 1 menu in sidebar (menu-roles)
 */
export async function seedRolesInterfaceElements(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding interface_elements for roles...');

  try {
    // Get all company IDs
    const companies = await ds.query<Array<{ id: string }>>(
      `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at`,
    );

    if (companies.length === 0) {
      console.log('⚠️  No companies found - skipping roles IE seed');
      return;
    }

    console.log(`   Found ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`);

    // Define the interface_elements to create
    const rolesInterfaceElements = [
      // Actions
      {
        elementId: 'action-create',
        elementType: 'action',
        elementLabel: 'Créer un rôle',
        interfaceName: 'roles',
      },
      {
        elementId: 'action-view-row',
        elementType: 'action',
        elementLabel: 'Voir les détails (ligne)',
        interfaceName: 'roles',
      },
      {
        elementId: 'action-edit-row',
        elementType: 'action',
        elementLabel: 'Modifier (ligne)',
        interfaceName: 'roles',
      },
      {
        elementId: 'action-delete-row',
        elementType: 'action',
        elementLabel: 'Supprimer (ligne)',
        interfaceName: 'roles',
      },
      {
        elementId: 'action-export-excel',
        elementType: 'action',
        elementLabel: 'Exporter en Excel',
        interfaceName: 'roles',
      },
      // Filters - IDs must match ALL_FILTER_GROUP_IDS in role-configs.ts
      {
        elementId: 'filter-role-groups',
        elementType: 'filter',
        elementLabel: 'Familles de rôles',
        interfaceName: 'roles',
      },
      {
        elementId: 'filter-statut',
        elementType: 'filter',
        elementLabel: 'Statut',
        interfaceName: 'roles',
      },
      {
        elementId: 'filter-modes',
        elementType: 'filter',
        elementLabel: 'Modes opérationnels',
        interfaceName: 'roles',
      },
      {
        elementId: 'filter-hierarchy',
        elementType: 'filter',
        elementLabel: 'Niveaux hiérarchiques',
        interfaceName: 'roles',
      },
      {
        elementId: 'filter-search',
        elementType: 'filter',
        elementLabel: 'Recherche',
        interfaceName: 'roles',
      },
    ];

    let totalInserted = 0;
    let totalSkipped = 0;

    // Insert roles interface elements
    for (const company of companies) {
      for (const elem of rolesInterfaceElements) {
        const result = await ds.query(
          `INSERT INTO interface_elements (
            id, company_id, interface_name, element_id, element_type, element_label,
            config, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::varchar, '{}'::jsonb, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1 AND interface_name = $2 AND element_id = $3 AND deleted_at IS NULL
          )
          RETURNING id`,
          [company.id, elem.interfaceName, elem.elementId, elem.elementType, elem.elementLabel],
        );

        if (result.length > 0) {
          totalInserted++;
        } else {
          totalSkipped++;
        }
      }
    }

    console.log(
      `✅ Roles interface elements seeded: ${totalInserted} inserted, ${totalSkipped} skipped`,
    );

    // Now seed menu-roles in sidebar
    console.log('🌱 Seeding menu-roles in sidebar...');

    // Find menu-admins parent to get group info
    const adminMenuSample = await ds.query<
      Array<{ group_label: string; group_icon: string; group_order: number }>
    >(
      `SELECT group_label, group_icon, group_order
       FROM interface_elements
       WHERE interface_name = 'sidebar' AND element_id = 'menu-admins' AND deleted_at IS NULL
       LIMIT 1`,
    );

    const groupLabel = adminMenuSample[0]?.group_label || 'Administration';
    const groupIcon = adminMenuSample[0]?.group_icon || 'Settings';
    const groupOrder = adminMenuSample[0]?.group_order || 5;

    let menuInserted = 0;
    let menuSkipped = 0;

    for (const company of companies) {
      const result = await ds.query(
        `INSERT INTO interface_elements (
          id, company_id, interface_name, element_id, element_type, element_label,
          config, group_label, group_icon, group_order, created_at, updated_at
        )
        SELECT gen_random_uuid(), $1::uuid, 'sidebar', 'menu-roles', 'menu', 'Rôles & Permissions',
          '{"routePath": "/dashboard/roles", "iconName": "Shield"}'::jsonb, $2::varchar, $3::varchar, $4::integer, now(), now()
        WHERE NOT EXISTS (
          SELECT 1 FROM interface_elements
          WHERE company_id = $1 AND interface_name = 'sidebar' AND element_id = 'menu-roles' AND deleted_at IS NULL
        )
        RETURNING id`,
        [company.id, groupLabel, groupIcon, groupOrder],
      );

      if (result.length > 0) {
        menuInserted++;
      } else {
        menuSkipped++;
      }
    }

    console.log(`✅ Sidebar menu-roles seeded: ${menuInserted} inserted, ${menuSkipped} skipped`);
    console.log(
      `🎉 Total: ${totalInserted + menuInserted} IE created, ${totalSkipped + menuSkipped} skipped`,
    );
  } catch (error) {
    console.error('❌ Error seeding roles interface elements:', error);
    throw error;
  }
}
