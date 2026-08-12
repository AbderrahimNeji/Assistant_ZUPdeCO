import { DataSource } from 'typeorm';
import { DEFAULT_ROLE_GROUPS } from '../../modules/roles/role-groups';

/**
 * Seeds default role_groups for each existing company.
 * Inserts the 5 default groups (admins, steering, operations, service_users, other)
 * with their icons and colors as defined in DEFAULT_ROLE_GROUPS.
 */
export async function seedRoleGroups(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding role_groups...');

  try {
    // Get all company IDs
    const companies = await ds.query<Array<{ id: string }>>(
      `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at`,
    );

    if (companies.length === 0) {
      console.log('⚠️  No companies found - skipping role_groups seed');
      return;
    }

    console.log(`   Found ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`);

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const company of companies) {
      for (const group of DEFAULT_ROLE_GROUPS) {
        const result = await ds.query(
          `INSERT INTO role_groups (
            id, company_id, code, label, icon, color, mode, sort_order, is_system, created_at, updated_at
          )
          SELECT gen_random_uuid(), $1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::integer, $8::boolean, now(), now()
          WHERE NOT EXISTS (
            SELECT 1 FROM role_groups
            WHERE company_id = $1 AND code = $2 AND deleted_at IS NULL
          )
          RETURNING id`,
          [
            company.id,
            group.code,
            group.label,
            group.icon,
            group.color,
            null, // mode = null (applies to all modes)
            group.sortOrder,
            group.isSystem,
          ],
        );

        if (result.length > 0) {
          totalInserted++;
        } else {
          totalSkipped++;
        }
      }
    }

    console.log(
      `✅ Role groups seeded: ${totalInserted} inserted, ${totalSkipped} skipped (already exist)`,
    );
  } catch (error) {
    console.error('❌ Error seeding role_groups:', error);
    throw error;
  }
}
