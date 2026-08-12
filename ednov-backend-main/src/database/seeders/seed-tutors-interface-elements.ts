import { DataSource } from 'typeorm';

/**
 * Seeds interface_elements for the 'tutors' management interface and sidebar.
 *
 * Creates:
 *  - 5 actions  (action-create, action-view-row, action-edit-row, action-delete-row, action-export-excel)
 *  - 1 menu parent (menu-tutors) in 'tutors' interface  — parent for tabs
 *  - 1 tab initial (tab-tutor) as child of menu-tutors
 *  - 5 filters matching ALL_FILTER_GROUP_IDS in tutor-configs.ts
 *  - 1 sidebar entry (menu-tutors) pointing to /dashboard/tutors
 */
export async function seedTutorsInterfaceElements(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding interface_elements for tutors...');

  try {
    const companies = await ds.query<Array<{ id: string }>>(
      `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at`,
    );

    if (companies.length === 0) {
      console.log('⚠️  No companies found - skipping tutors IE seed');
      return;
    }

    console.log(`   Found ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`);

    // Elements in the 'tutors' management interface (not the sidebar)
    const tutorsElements = [
      // Actions
      { elementId: 'action-create', elementType: 'action', elementLabel: 'Créer un tuteur' },
      { elementId: 'action-view-row', elementType: 'action', elementLabel: 'Voir les détails (ligne)' },
      { elementId: 'action-edit-row', elementType: 'action', elementLabel: 'Modifier (ligne)' },
      { elementId: 'action-delete-row', elementType: 'action', elementLabel: 'Supprimer (ligne)' },
      { elementId: 'action-export-excel', elementType: 'action', elementLabel: 'Exporter en Excel' },
      // Filters — must match ALL_FILTER_GROUP_IDS in tutor-configs.ts
      { elementId: 'filter-statut', elementType: 'filter', elementLabel: 'Statut' },
      { elementId: 'filter-matiere', elementType: 'filter', elementLabel: 'Matières' },
      { elementId: 'filter-etablissement', elementType: 'filter', elementLabel: 'Établissement' },
      { elementId: 'filter-disponibilite', elementType: 'filter', elementLabel: 'Disponibilité' },
      { elementId: 'filter-experience', elementType: 'filter', elementLabel: 'Expérience' },
    ];

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const company of companies) {
      // ── 1. Create or find the menu-tutors parent in 'tutors' interface ──
      const menuResult = await ds.query<Array<{ id: string }>>(
        `INSERT INTO interface_elements (
            id, company_id, interface_name, element_id, element_type, element_label,
            config, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, 'tutors', 'menu-tutors', 'menu', 'Gestion des Tuteurs',
            '{}'::jsonb, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1 AND interface_name = 'tutors' AND element_id = 'menu-tutors' AND deleted_at IS NULL
          )
          RETURNING id`,
        [company.id],
      );

      let menuTutorsId: string;
      if (menuResult.length > 0) {
        menuTutorsId = menuResult[0].id;
        totalInserted++;
      } else {
        const existing = await ds.query<Array<{ id: string }>>(
          `SELECT id FROM interface_elements WHERE company_id = $1::uuid AND interface_name = 'tutors' AND element_id = 'menu-tutors' AND deleted_at IS NULL`,
          [company.id],
        );
        menuTutorsId = existing[0].id;
        totalSkipped++;
      }

      // ── 2. Create tab-tutor as child of menu-tutors ──
      const tabResult = await ds.query(
        `INSERT INTO interface_elements (
            id, company_id, interface_name, element_id, element_type, element_label,
            parent_id, config, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, 'tutors', 'tab-tutor', 'tab', 'Tuteurs',
            $2::uuid, '{"tabValue": "tutor", "icon": "GraduationCap"}'::jsonb, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1 AND interface_name = 'tutors' AND element_id = 'tab-tutor' AND deleted_at IS NULL
          )
          RETURNING id`,
        [company.id, menuTutorsId],
      );
      if (tabResult.length > 0) totalInserted++; else totalSkipped++;

      // ── 3. Create actions and filters ──
      for (const elem of tutorsElements) {
        const result = await ds.query(
          `INSERT INTO interface_elements (
              id, company_id, interface_name, element_id, element_type, element_label,
              config, created_at, updated_at
            )
            SELECT gen_random_uuid(), $1::uuid, 'tutors', $2::varchar, $3::varchar, $4::varchar,
              '{}'::jsonb, now(), now()
            WHERE NOT EXISTS (
              SELECT 1 FROM interface_elements
              WHERE company_id = $1 AND interface_name = 'tutors' AND element_id = $2 AND deleted_at IS NULL
            )
            RETURNING id`,
          [company.id, elem.elementId, elem.elementType, elem.elementLabel],
        );
        if (result.length > 0) totalInserted++; else totalSkipped++;
      }

      // ── 4. Create sidebar entry menu-tutors ──
      const refMenu = await ds.query<Array<{ group_label: string; group_icon: string; group_order: number }>>(
        `SELECT group_label, group_icon, group_order FROM interface_elements
         WHERE interface_name = 'sidebar' AND element_id = 'menu-tutors' AND deleted_at IS NULL LIMIT 1`,
      );
      const groupLabel = refMenu[0]?.group_label || 'Équipe';
      const groupIcon = refMenu[0]?.group_icon || 'Users';
      const groupOrder = refMenu[0]?.group_order || 3;

      const sidebarResult = await ds.query(
        `INSERT INTO interface_elements (
            id, company_id, interface_name, element_id, element_type, element_label,
            config, group_label, group_icon, group_order, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, 'sidebar', 'menu-tutors', 'menu', 'Tuteurs',
            '{"routePath": "/dashboard/tutors", "iconName": "GraduationCap"}'::jsonb,
            $2::varchar, $3::varchar, $4::integer, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1 AND interface_name = 'sidebar' AND element_id = 'menu-tutors' AND deleted_at IS NULL
          )
          RETURNING id`,
        [company.id, groupLabel, groupIcon, groupOrder],
      );
      if (sidebarResult.length > 0) totalInserted++; else totalSkipped++;
    }

    console.log(`✅ Tutors interface elements seeded: ${totalInserted} inserted, ${totalSkipped} skipped`);
  } catch (error) {
    console.error('❌ Error seeding tutors interface elements:', error);
    throw error;
  }
}
