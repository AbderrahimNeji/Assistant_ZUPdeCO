import { DataSource } from 'typeorm';

/**
 * Creates missing 'super_admin' role group.
 * Fixes the orphan reference where roles have role_group = 'super_admin'
 * but the group doesn't exist in role_groups table.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedFixRoleGroupOrphan(ds: DataSource): Promise<void> {
  console.log('🔧 Creating missing super_admin role group...');

  try {
    // Check if super_admin group already exists
    const existing = await ds.query(
      `SELECT id, code FROM role_groups
       WHERE code = 'super_admin'
       AND deleted_at IS NULL
       LIMIT 1`,
    );

    if (existing.length > 0) {
      console.log('   ⚠ super_admin role group already exists, skipping');
      console.log(`✅ Role group check completed`);
      return;
    }

    // Insert super_admin group for each company that has roles with role_group='super_admin'
    const result = await ds.query(
      `INSERT INTO role_groups (company_id, code, label, icon, color, mode, sort_order, is_system, created_at, updated_at)
       SELECT DISTINCT
         r.company_id,
         'super_admin'::varchar,
         'Super Administrateurs'::varchar,
         'ShieldUser'::varchar,
         'color-1-nuance-1'::varchar,
         'in_person'::varchar,
         1,
         true,
         now(),
         now()
       FROM roles r
       WHERE r.role_group = 'super_admin'
       AND r.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM role_groups rg
         WHERE rg.company_id = r.company_id
         AND rg.code = 'super_admin'
         AND rg.deleted_at IS NULL
       )
       RETURNING id, code, company_id`,
    );

    if (result.length > 0) {
      console.log(`   ✓ Created ${result.length} super_admin role group(s):`);
      result.forEach((r: any) => console.log(`     - company_id: ${r.company_id}`));
    } else {
      console.log('   ⚠ No orphan role groups found');
    }

    console.log(`✅ Role group orphan fix completed`);
  } catch (error) {
    console.error('❌ Error fixing role group orphan:', error);
    throw error;
  }
}
