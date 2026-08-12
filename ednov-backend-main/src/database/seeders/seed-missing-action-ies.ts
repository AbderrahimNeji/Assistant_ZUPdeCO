import { DataSource } from 'typeorm';

/**
 * Seeds missing action interface elements that were previously hardcoded.
 * - action-cancel, action-cancel-row for sessions
 * - action-view-report for sessions and reports
 * - action-export-excel for pairs
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedMissingActionIes(ds: DataSource): Promise<void> {
  console.log('📝 Seeding missing action interface elements...');

  const actions = [
    {
      elementId: 'action-cancel',
      elementType: 'action',
      elementLabel: 'Annuler',
      interfaceName: 'sessions',
      groupLabel: 'Séances',
      groupOrder: 30,
    },
    {
      elementId: 'action-cancel-row',
      elementType: 'action',
      elementLabel: 'Annuler',
      interfaceName: 'sessions',
      groupLabel: 'Séances',
      groupOrder: 31,
    },
    {
      elementId: 'action-view-report',
      elementType: 'action',
      elementLabel: 'Voir le rapport',
      interfaceName: 'sessions',
      groupLabel: 'Séances',
      groupOrder: 32,
    },
    {
      elementId: 'action-view-report',
      elementType: 'action',
      elementLabel: 'Consulter le rapport',
      interfaceName: 'reports',
      groupLabel: 'Rapports',
      groupOrder: 30,
    },
    {
      elementId: 'action-export-excel',
      elementType: 'action',
      elementLabel: 'Exporter Excel',
      interfaceName: 'pairs',
      groupLabel: 'Binômes',
      groupOrder: 30,
    },
  ];

  try {
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const action of actions) {
      const result = await ds.query(
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
         SELECT 
           c.id,
           $1::varchar,
           $2::varchar,
           $3::varchar,
           $4::varchar,
           $5::varchar,
           $6::integer,
           now(),
           now()
         FROM companies c
         WHERE NOT EXISTS (
           SELECT 1 FROM interface_elements ie
           WHERE ie.company_id = c.id
           AND ie.element_id = $1::varchar
           AND ie.interface_name = $4::varchar
           AND ie.deleted_at IS NULL
         )
         AND c.deleted_at IS NULL
         RETURNING id, element_id, interface_name`,
        [
          action.elementId,
          action.elementType,
          action.elementLabel,
          action.interfaceName,
          action.groupLabel,
          action.groupOrder,
        ],
      );

      if (result.length > 0) {
        totalCreated += result.length;
        console.log(
          `   ✓ Created ${result.length} '${action.elementId}' for '${action.interfaceName}'`,
        );
      } else {
        totalSkipped++;
      }
    }

    console.log(
      `✅ Missing action IEs seeded: ${totalCreated} created, ${totalSkipped} already existed`,
    );
  } catch (error) {
    console.error('❌ Error seeding missing action IEs:', error);
    throw error;
  }
}
