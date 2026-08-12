import { DataSource } from 'typeorm';

const TARGET_ROLE_CODES = [
  'coordinator',
  'volunteer',
  'professor',
  'admin',
  'manager',
  'recruiter',
];

/**
 * Seeds the 'tutorials' interface with a single page element and links it to
 * coordinator, VSC (volunteer), professor, admin (super admin), manager, recruiter.
 *
 * Fixes the mismatch where the sidebar menu "Tutoriels et aide" was visible to
 * all roles but the ProtectedRoute guard on /dashboard/tutorials checked for
 * elements in the 'tutorials' interface — which had none, causing a 403 for everyone.
 */
export async function seedTutorialsInterfaceElements(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding interface_elements for tutorials page...');

  const companies = await ds.query<Array<{ id: string }>>(
    `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at`,
  );

  if (companies.length === 0) {
    console.log('⚠️  No companies found - skipping tutorials IE seed');
    return;
  }

  console.log(`   Found ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`);

  let totalIeInserted = 0;
  let totalIeSkipped = 0;
  let totalRieInserted = 0;

  for (const company of companies) {
    const result = await ds.query(
      `INSERT INTO interface_elements (
        id, company_id, interface_name, element_id, element_type, element_label,
        config, created_at, updated_at
      )
      SELECT gen_random_uuid(), $1::uuid, 'tutorials', 'page-tutorials', 'page', 'Tutoriels et aide',
        '{}'::jsonb, now(), now()
      WHERE NOT EXISTS (
        SELECT 1 FROM interface_elements
        WHERE company_id = $1 AND interface_name = 'tutorials' AND element_id = 'page-tutorials' AND deleted_at IS NULL
      )
      RETURNING id`,
      [company.id],
    );

    if (result.length > 0) {
      totalIeInserted++;
    } else {
      totalIeSkipped++;
    }

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
      INNER JOIN roles r
        ON r.company_id = ie.company_id
        AND r.deleted_at IS NULL
        AND r.code = ANY($2::text[])
      WHERE ie.company_id = $1::uuid
        AND ie.interface_name = 'tutorials'
        AND ie.element_id = 'page-tutorials'
        AND ie.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM role_interface_elements rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id AND rie.company_id = ie.company_id
        )
      RETURNING id`,
      [company.id, TARGET_ROLE_CODES],
    );

    totalRieInserted += rieResult.length;
  }

  console.log(`✅ Tutorials IE: ${totalIeInserted} inserted, ${totalIeSkipped} skipped`);
  console.log(`✅ Role bindings: ${totalRieInserted} inserted`);
}
