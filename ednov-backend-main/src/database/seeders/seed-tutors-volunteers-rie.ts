import { DataSource } from 'typeorm';

/**
 * Seeds role_interface_elements giving admin, coordinator, and manager roles
 * full access to all tutors and volunteers interface elements.
 *
 * Only inserts entries that don't already exist (idempotent).
 */
export async function seedTutorsVolunteersRie(ds: DataSource): Promise<void> {
  console.log('🔐 Seeding RIE: admin/coordinator/manager → tutors & volunteers IE...');

  try {
    const targetRoleCodes = ['admin', 'coordinator', 'manager'];
    const targetInterfaces = ['tutors', 'volunteers'];

    let totalInserted = 0;
    let totalSkipped = 0;

    // Find all companies
    const companies = await ds.query<Array<{ id: string }>>(
      `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at`,
    );

    if (companies.length === 0) {
      console.log('⚠️  No companies found - skipping tutors/volunteers RIE seed');
      return;
    }

    for (const company of companies) {
      // Get admin/coordinator/manager roles for this company
      const roles = await ds.query<Array<{ id: string; code: string }>>(
        `SELECT id, code FROM roles
         WHERE company_id = $1::uuid
         AND code = ANY($2::varchar[])
         AND deleted_at IS NULL`,
        [company.id, targetRoleCodes],
      );

      if (roles.length === 0) {
        console.log(`   ⚠️  No admin/coordinator/manager roles found for company ${company.id}`);
        continue;
      }

      // Get all IE for tutors and volunteers interfaces for this company
      const interfaceElements = await ds.query<Array<{ id: string; element_id: string; interface_name: string }>>(
        `SELECT id, element_id, interface_name FROM interface_elements
         WHERE company_id = $1::uuid
         AND interface_name = ANY($2::varchar[])
         AND deleted_at IS NULL`,
        [company.id, targetInterfaces],
      );

      if (interfaceElements.length === 0) {
        console.log(
          `   ⚠️  No tutors/volunteers IE found for company ${company.id}. Run seed:tutors-interface-elements and seed:volunteers-interface-elements first.`,
        );
        continue;
      }

      // For each role × each IE, insert RIE if not exists
      for (const role of roles) {
        for (const ie of interfaceElements) {
          const result = await ds.query(
            `INSERT INTO role_interface_elements (id, company_id, role_id, element_id, visibility_scope, created_at, updated_at)
             SELECT gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, '{}'::jsonb, now(), now()
             WHERE NOT EXISTS (
               SELECT 1 FROM role_interface_elements
               WHERE company_id = $1 AND role_id = $2 AND element_id = $3
             )
             RETURNING id`,
            [company.id, role.id, ie.id],
          );
          if (result.length > 0) totalInserted++; else totalSkipped++;
        }
      }
    }

    console.log(
      `✅ Tutors/Volunteers RIE seeded: ${totalInserted} inserted, ${totalSkipped} skipped`,
    );
  } catch (error) {
    console.error('❌ Error seeding tutors/volunteers RIE:', error);
    throw error;
  }
}
