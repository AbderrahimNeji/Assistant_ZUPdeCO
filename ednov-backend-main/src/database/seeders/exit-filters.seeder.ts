import { DataSource } from 'typeorm';

const COMPANY_ID = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

export async function seedExitFilters(ds: DataSource): Promise<void> {
  console.log('Seeding exit filters (Date de sortie, Motif de sortie) for students...');

  // 1. Insert the two filter elements (idempotent via element_id uniqueness)
  for (const [elementId, elementLabel] of [
    ['filter-exit-date', 'Date de sortie'],
    ['filter-exit-reason', 'Motif de sortie'],
  ] as const) {
    await ds.query(
      `
      INSERT INTO "interface_elements"
        ("id", "company_id", "interface_name", "element_id", "element_type", "element_label",
         "config", "created_at", "updated_at")
      SELECT
        gen_random_uuid(), $1::uuid, 'students', $2::varchar, 'filter', $3::varchar, '{}', now(), now()
      WHERE NOT EXISTS (
        SELECT 1 FROM "interface_elements"
        WHERE company_id = $1::uuid AND interface_name = 'students' AND element_id = $2::varchar
      )
      `,
      [COMPANY_ID, elementId, elementLabel],
    );
    console.log(`  OK interface_elements: ${elementId} inserted (or already exists)`);
  }

  // 2. Link every role of the company to the two new filters (visible = true)
  for (const elementId of ['filter-exit-date', 'filter-exit-reason'] as const) {
    await ds.query(
      `
      INSERT INTO "role_interface_elements"
        ("id", "company_id", "role_id", "element_id", "visible", "order", "width",
         "created_at", "updated_at")
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
      FROM "roles" r, "interface_elements" ie
      WHERE r.company_id = $1::uuid
        AND ie.company_id = $1::uuid
        AND ie.interface_name = 'students'
        AND ie.element_id = $2::varchar
        AND NOT EXISTS (
          SELECT 1 FROM "role_interface_elements" rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
      `,
      [COMPANY_ID, elementId],
    );
    console.log(`  OK role_interface_elements: all roles linked for ${elementId}`);
  }

  console.log('Done!');
}
