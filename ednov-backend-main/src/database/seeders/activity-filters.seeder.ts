import { DataSource } from 'typeorm';

const COMPANY_ID = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

const FILTER_ELEMENTS = [
  { elementId: 'filter-date-entree', elementLabel: "Date d'entrée" },
  { elementId: 'filter-date-sortie', elementLabel: 'Date de sortie' },
  { elementId: 'filter-motif-sortie', elementLabel: 'Motif de sortie' },
] as const;

const INTERFACE_NAMES = ['tutors', 'volunteers'] as const;

export async function seedActivityFilters(ds: DataSource): Promise<void> {
  console.log("Seeding activity filters for tutors and volunteers (zupdeco only)...");

  let inserted = 0;
  let skipped = 0;

  for (const interfaceName of INTERFACE_NAMES) {
    for (const { elementId, elementLabel } of FILTER_ELEMENTS) {
      // 1. Insert interface_element (idempotent)
      const ieResult = await ds.query<Array<{ id: string }>>(
        `INSERT INTO interface_elements
            (id, company_id, interface_name, element_id, element_type, element_label, config, created_at, updated_at)
          SELECT gen_random_uuid(), $1::uuid, $2::varchar, $3::varchar, 'filter', $4::varchar, '{}'::jsonb, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM interface_elements
            WHERE company_id = $1::uuid AND interface_name = $2::varchar AND element_id = $3::varchar AND deleted_at IS NULL
          )
          RETURNING id`,
        [COMPANY_ID, interfaceName, elementId, elementLabel],
      );

      if (ieResult.length > 0) {
        inserted++;
        console.log(`  + ${interfaceName}/${elementId} inserted`);
      } else {
        skipped++;
        console.log(`  ~ ${interfaceName}/${elementId} already exists`);
      }

      // 2. Link all company roles to this element (idempotent)
      await ds.query(
        `INSERT INTO role_interface_elements
            (id, company_id, role_id, element_id, visible, "order", width, created_at, updated_at)
          SELECT
            gen_random_uuid(),
            r.company_id,
            r.id,
            ie.id,
            true,
            0,
            'auto',
            now(),
            now()
          FROM roles r
          CROSS JOIN interface_elements ie
          WHERE r.company_id = $1::uuid
            AND ie.company_id = $1::uuid
            AND ie.interface_name = $2::varchar
            AND ie.element_id = $3::varchar
            AND ie.deleted_at IS NULL
            AND r.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM role_interface_elements rie
              WHERE rie.role_id = r.id AND rie.element_id = ie.id
            )`,
        [COMPANY_ID, interfaceName, elementId],
      );
    }
  }

  console.log(`Done! ${inserted} inserted, ${skipped} already existed.`);
}
