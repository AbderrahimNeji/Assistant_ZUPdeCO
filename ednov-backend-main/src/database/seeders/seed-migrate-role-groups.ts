import { DataSource } from 'typeorm';

/**
 * Migrates existing system roles to their new dedicated role_group codes.
 *
 * Before this migration:
 *   coordinator → role_group = 'steering'
 *   manager     → role_group = 'steering'
 *   PROFESSOR   → role_group = 'operations' or 'other'
 *   tutor       → role_group = 'service_user'
 *   volunteer   → role_group = 'operations'
 *   student     → role_group = 'other'
 *
 * After this migration:
 *   coordinator → role_group = 'admins'
 *   manager     → role_group = 'admins'
 *   PROFESSOR / professor → role_group = 'volunteers'
 *   tutor       → role_group = 'tutors'
 *   volunteer   → role_group = 'volunteers'
 *   student     → role_group = 'students'
 */
export async function seedMigrateRoleGroups(ds: DataSource): Promise<void> {
  console.log('🔄 Migrating role_group for coordinator/manager/PROFESSOR/tutor/volunteer/student roles...');

  const migrations: Array<{ code: string; newGroup: string }> = [
    { code: 'coordinator', newGroup: 'admins' },
    { code: 'manager', newGroup: 'admins' },
    { code: 'PROFESSOR', newGroup: 'volunteers' },
    { code: 'professor', newGroup: 'volunteers' },
    { code: 'tutor', newGroup: 'tutors' },
    { code: 'volunteer', newGroup: 'volunteers' },
    { code: 'student', newGroup: 'students' },
  ];

  try {
    let totalUpdated = 0;

    for (const { code, newGroup } of migrations) {
      const result = await ds.query(
        `UPDATE roles
         SET role_group = $1::varchar,
             updated_at = now()
         WHERE code = $2::varchar
         AND deleted_at IS NULL
         AND role_group != $1::varchar
         RETURNING id, code, role_group`,
        [newGroup, code],
      );

      if (result.length > 0) {
        totalUpdated += result.length;
        console.log(`   ✓ Updated ${result.length} role(s) '${code}' → role_group: '${newGroup}'`);
      } else {
        console.log(`   ⚠ No update needed for '${code}' (already '${newGroup}' or not found)`);
      }
    }

    console.log(`✅ Role group migration completed: ${totalUpdated} roles updated`);
  } catch (error) {
    console.error('❌ Error migrating role groups:', error);
    throw error;
  }
}
