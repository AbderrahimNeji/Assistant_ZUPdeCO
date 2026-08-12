import { DataSource } from 'typeorm';

/**
 * Seeds interface_elements for the 'volunteers' management interface and sidebar.
 *
 * Creates:
 *  - 5 actions  (action-create, action-view-row, action-edit-row, action-delete-row, action-export-excel)
 *  - 1 menu parent (menu-volunteers) in 'volunteers' interface — parent for tabs
 *  - 1 tab initial (tab-volunteer) as child of menu-volunteers
 *  - 5 filters matching ALL_FILTER_GROUP_IDS in volunteer-configs.ts
 *  - 1 sidebar entry (menu-volunteers) pointing to /dashboard/volunteers
 */
export async function seedVolunteersInterfaceElements(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding interface_elements for volunteers...');

  try {
    const companies = await ds.query<Array<{ id: string }>>(
      `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at`,
    );

    if (companies.length === 0) {
      console.log('⚠️  No companies found - skipping volunteers IE seed');
      return;
    }

    console.log(`   Found ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`);

    const volunteersElements = [
      // Actions
      { elementId: 'action-create', elementType: 'action', elementLabel: 'Créer un VSC' },
      { elementId: 'action-view-row', elementType: 'action', elementLabel: 'Voir les détails (ligne)' },
      { elementId: 'action-edit-row', elementType: 'action', elementLabel: 'Modifier (ligne)' },
      { elementId: 'action-delete-row', elementType: 'action', elementLabel: 'Supprimer (ligne)' },
      { elementId: 'action-export-excel', elementType: 'action', elementLabel: 'Exporter en Excel' },
      // Filters — must match ALL_FILTER_GROUP_IDS in volunteer-configs.ts
      { elementId: 'filter-statut', elementType: 'filter', elementLabel: 'Statut' },
      { elementId: 'filter-matiere', elementType: 'filter', elementLabel: 'Matières' },
      { elementId: 'filter-disponibilite', elementType: 'filter', elementLabel: 'Disponibilité' },
      { elementId: 'filter-etablissement', elementType: 'filter', elementLabel: 'Établissement' },
      { elementId: 'filter-dates', elementType: 'filter', elementLabel: 'Dates' },
    ];

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const company of companies) {
      // ── 1. Create or find the menu-volunteers parent in 'volunteers' interface ──
      const menuResult = await ds.query<Array<{ id: string }>>(
        `INSERT INTO interface_elements (
            id, company_id, interface_name, element_id, element_type, element_label,
            config, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, 'volunteers', 'menu-volunteers', 'menu', 'Gestion des VSC',
            '{}'::jsonb, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1 AND interface_name = 'volunteers' AND element_id = 'menu-volunteers' AND deleted_at IS NULL
          )
          RETURNING id`,
        [company.id],
      );

      let menuVolunteersId: string;
      if (menuResult.length > 0) {
        menuVolunteersId = menuResult[0].id;
        totalInserted++;
      } else {
        const existing = await ds.query<Array<{ id: string }>>(
          `SELECT id FROM interface_elements WHERE company_id = $1::uuid AND interface_name = 'volunteers' AND element_id = 'menu-volunteers' AND deleted_at IS NULL`,
          [company.id],
        );
        menuVolunteersId = existing[0].id;
        totalSkipped++;
      }

      // ── 2. Create tab-volunteer as child of menu-volunteers ──
      const tabResult = await ds.query(
        `INSERT INTO interface_elements (
            id, company_id, interface_name, element_id, element_type, element_label,
            parent_id, config, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, 'volunteers', 'tab-volunteer', 'tab', 'VSC',
            $2::uuid, '{"tabValue": "volunteer", "icon": "Heart"}'::jsonb, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1 AND interface_name = 'volunteers' AND element_id = 'tab-volunteer' AND deleted_at IS NULL
          )
          RETURNING id`,
        [company.id, menuVolunteersId],
      );
      if (tabResult.length > 0) totalInserted++; else totalSkipped++;

      // ── 3. Create actions and filters ──
      for (const elem of volunteersElements) {
        const result = await ds.query(
          `INSERT INTO interface_elements (
              id, company_id, interface_name, element_id, element_type, element_label,
              config, created_at, updated_at
            )
            SELECT gen_random_uuid(), $1::uuid, 'volunteers', $2::varchar, $3::varchar, $4::varchar,
              '{}'::jsonb, now(), now()
            WHERE NOT EXISTS (
              SELECT 1 FROM interface_elements
              WHERE company_id = $1 AND interface_name = 'volunteers' AND element_id = $2 AND deleted_at IS NULL
            )
            RETURNING id`,
          [company.id, elem.elementId, elem.elementType, elem.elementLabel],
        );
        if (result.length > 0) totalInserted++; else totalSkipped++;
      }

      // ── 4. Create sidebar entry menu-volunteers ──
      const sidebarResult = await ds.query(
        `INSERT INTO interface_elements (
            id, company_id, interface_name, element_id, element_type, element_label,
            config, group_label, group_icon, group_order, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, 'sidebar', 'menu-volunteers', 'menu', 'VSC',
            '{"routePath": "/dashboard/volunteers", "iconName": "Heart"}'::jsonb,
            'Équipe', 'Users', 3, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1 AND interface_name = 'sidebar' AND element_id = 'menu-volunteers' AND deleted_at IS NULL
          )
          RETURNING id`,
        [company.id],
      );
      if (sidebarResult.length > 0) totalInserted++; else totalSkipped++;
    }

    console.log(`✅ Volunteers interface elements seeded: ${totalInserted} inserted, ${totalSkipped} skipped`);
  } catch (error) {
    console.error('❌ Error seeding volunteers interface elements:', error);
    throw error;
  }
}
