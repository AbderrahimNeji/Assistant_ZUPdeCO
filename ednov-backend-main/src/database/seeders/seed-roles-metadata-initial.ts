import { DataSource } from 'typeorm';

/**
 * Seeds metadata (icon, color, hierarchy) for initial system roles.
 * Updates existing roles with visual and hierarchical data.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRolesMetadataInitial(ds: DataSource): Promise<void> {
  console.log('🎨 Seeding initial roles metadata...');

  const rolesMetadata: Record<
    string,
    { icon: string; color: string; hierarchyLevel: number; mode?: null }
  > = {
    admin: { icon: 'Shield', color: '#7C3AED', hierarchyLevel: 1, mode: null },
    manager: { icon: 'Compass', color: '#2563EB', hierarchyLevel: 1, mode: null },
    coordinator: { icon: 'MapPin', color: '#0EA5E9', hierarchyLevel: 2, mode: null },
    volunteer: { icon: 'UserCheck', color: '#059669', hierarchyLevel: 1, mode: null },
    tutor: { icon: 'GraduationCap', color: '#D97706', hierarchyLevel: 1, mode: null },
    student: { icon: 'BookOpen', color: '#F59E0B', hierarchyLevel: 2, mode: null },
  };

  try {
    let totalUpdated = 0;

    for (const [code, metadata] of Object.entries(rolesMetadata)) {
      const result = await ds.query(
        `UPDATE roles
         SET icon = $1::varchar,
             color = $2::varchar,
             hierarchy_level = $3::integer,
             mode = $4::varchar,
             updated_at = now()
         WHERE code = $5::varchar
         AND deleted_at IS NULL
         RETURNING id, code`,
        [metadata.icon, metadata.color, metadata.hierarchyLevel, metadata.mode, code],
      );

      if (result.length > 0) {
        totalUpdated += result.length;
        console.log(`   ✓ Updated ${result.length} '${code}' role(s)`);
      }
    }

    if (totalUpdated === 0) {
      console.log('   ⚠ No roles found to update');
    }

    console.log(`✅ Initial roles metadata seeded: ${totalUpdated} updated`);
  } catch (error) {
    console.error('❌ Error seeding initial roles metadata:', error);
    throw error;
  }
}
