import { DataSource } from 'typeorm';

/**
 * Fixes is_system flag on roles.
 * Only 'admin' should be a system role - coordinator, manager, tutor should be editable.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedFixIsSystemRoles(ds: DataSource): Promise<void> {
  console.log('🔧 Fixing is_system flags on roles...');

  try {
    const result = await ds.query(
      `UPDATE roles
       SET is_system = false,
           updated_at = now()
       WHERE code IN ('coordinator', 'manager', 'tutor')
       AND is_system = true
       AND deleted_at IS NULL
       RETURNING id, code`,
    );

    if (result.length > 0) {
      console.log(`   ✓ Updated ${result.length} role(s):`);
      result.forEach((r: any) => console.log(`     - ${r.code}`));
    } else {
      console.log('   ⚠ No roles needed updating (already correct)');
    }

    console.log(`✅ is_system flags fixed`);
  } catch (error) {
    console.error('❌ Error fixing is_system flags:', error);
    throw error;
  }
}
