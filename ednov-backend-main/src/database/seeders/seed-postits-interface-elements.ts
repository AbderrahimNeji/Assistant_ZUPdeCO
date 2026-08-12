import { DataSource } from 'typeorm';

/**
 * Seeds interface_elements for post-its assigned features on the dashboard.
 *
 * Creates:
 *  - postits-board-toggle          (action) - Toggle Personnel / Assigné
 *  - postits-assigned-filter       (filter) - Filtres vue assignée
 *  - postits-assigned-selection-bar (action) - Sélection groupée
 *  - postits-assigned-create       (action) - Créer un post-it assigné
 *
 * All elements are in the 'dashboard' interface, group 'postits'.
 * Linked to all existing roles automatically.
 */
export async function seedPostitsInterfaceElements(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding interface_elements for post-its assigned features...');

  try {
    const companies = await ds.query<Array<{ id: string }>>(
      `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at`,
    );

    if (companies.length === 0) {
      console.log('⚠️  No companies found - skipping post-its IE seed');
      return;
    }

    console.log(`   Found ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`);

    const postitsElements = [
      {
        elementId: 'postits-board-toggle',
        elementType: 'action',
        elementLabel: 'Toggle Personnel / Assigné',
      },
      {
        elementId: 'postits-assigned-filter',
        elementType: 'filter',
        elementLabel: 'Filtres vue assignée',
      },
      {
        elementId: 'postits-assigned-selection-bar',
        elementType: 'action',
        elementLabel: 'Sélection groupée',
      },
      {
        elementId: 'postits-assigned-create',
        elementType: 'action',
        elementLabel: 'Créer un post-it assigné',
      },
    ];

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalRieInserted = 0;

    for (const company of companies) {
      // Insert interface_elements for this company
      for (const elem of postitsElements) {
        const result = await ds.query(
          `INSERT INTO interface_elements (
            id, company_id, interface_name, element_id, element_type, element_label,
            config, group_label, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, 'dashboard', $2::varchar, $3::varchar, $4::varchar,
            '{}'::jsonb, 'postits', now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1 AND interface_name = 'dashboard' AND element_id = $2 AND deleted_at IS NULL
          )
          RETURNING id`,
          [company.id, elem.elementId, elem.elementType, elem.elementLabel],
        );

        if (result.length > 0) {
          totalInserted++;
        } else {
          totalSkipped++;
        }
      }

      // Link all 4 elements to all roles of this company
      const rieResult = await ds.query(
        `INSERT INTO role_interface_elements (
          id, company_id, role_id, element_id, visible, "order", created_at, updated_at
        )
        SELECT
          gen_random_uuid(),
          ie.company_id,
          r.id,
          ie.id,
          true,
          0,
          now(),
          now()
        FROM interface_elements ie
        INNER JOIN roles r ON r.company_id = ie.company_id AND r.deleted_at IS NULL
        WHERE ie.company_id = $1::uuid
          AND ie.interface_name = 'dashboard'
          AND ie.element_id IN (
            'postits-board-toggle',
            'postits-assigned-filter',
            'postits-assigned-selection-bar',
            'postits-assigned-create'
          )
          AND ie.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id AND rie.element_id = ie.id AND rie.company_id = ie.company_id
          )
        RETURNING id`,
        [company.id],
      );

      totalRieInserted += rieResult.length;
    }

    console.log(
      `✅ Post-its interface elements seeded: ${totalInserted} inserted, ${totalSkipped} skipped`,
    );
    console.log(`✅ Role bindings created: ${totalRieInserted} inserted`);
  } catch (error) {
    console.error('❌ Error seeding post-its interface elements:', error);
    throw error;
  }
}
