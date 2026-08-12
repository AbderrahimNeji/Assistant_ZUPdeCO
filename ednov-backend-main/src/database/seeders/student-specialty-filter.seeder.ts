import { DataSource } from 'typeorm';

const COMPANY_ID = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

export async function seedStudentSpecialtyFilter(ds: DataSource): Promise<void> {
  console.log('Seeding filter-specialties filter for students...');

  // 1. Insert interface_element filter for the target company
  await ds.query(`
    INSERT INTO "interface_elements"
      ("id", "company_id", "interface_name", "element_id", "element_type", "element_label",
       "config", "created_at", "updated_at")
    VALUES (
      gen_random_uuid(),
      $1,
      'students',
      'filter-specialties',
      'filter',
      'Spécialités',
      '{}',
      now(),
      now()
    )
    ON CONFLICT DO NOTHING
  `, [COMPANY_ID]);

  console.log('  OK interface_elements: filter-specialties inserted');

  // 2. Link to all roles of the target company (visible=true)
  await ds.query(`
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
    WHERE r.company_id = $1
      AND ie.company_id = $1
      AND ie.interface_name = 'students'
      AND ie.element_id = 'filter-specialties'
      AND NOT EXISTS (
        SELECT 1 FROM "role_interface_elements" rie
        WHERE rie.role_id = r.id AND rie.element_id = ie.id
      )
  `, [COMPANY_ID]);

  console.log('  OK role_interface_elements: all roles linked with visible=true');
  console.log('Done!');
}
