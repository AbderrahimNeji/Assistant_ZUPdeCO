import { DataSource } from 'typeorm';

/**
 * Updates system roles with icons and dynamic branding colors.
 *
 * Color format: 'color-{X}-nuance-{Y}' → resolved in frontend to var(--color-{X}-nuance-{Y}).
 * This matches the branding CSS variable system (var(--color-2-nuance-1) etc.).
 *
 * Admin-type roles use distinct brand colors.
 * Tutor/Volunteer/Student share the same primary color initially (color-2-nuance-1).
 */
export async function seedUpdateSystemRolesStyles(ds: DataSource): Promise<void> {
  console.log('🎨 Updating system roles with icons and branding colors...');

  const roleStyles: Record<
    string,
    { icon: string; color: string; hierarchyLevel?: number }
  > = {
    admin: { icon: 'Shield', color: 'color-2-nuance-1', hierarchyLevel: 1 },
    coordinator: { icon: 'Compass', color: 'color-1-nuance-1', hierarchyLevel: 2 },
    manager: { icon: 'Briefcase', color: 'color-3-nuance-1', hierarchyLevel: 3 },
    tutor: { icon: 'GraduationCap', color: 'color-2-nuance-1' },
    volunteer: { icon: 'Heart', color: 'color-2-nuance-1' },
    student: { icon: 'BookOpen', color: 'color-2-nuance-1' },
  };

  try {
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const [code, style] of Object.entries(roleStyles)) {
      const result = await ds.query(
        `UPDATE roles
         SET icon = $1::varchar,
             color = $2::varchar,
             hierarchy_level = COALESCE($3::integer, hierarchy_level),
             updated_at = now()
         WHERE code = $4::varchar
         AND deleted_at IS NULL
         RETURNING id`,
        [style.icon, style.color, style.hierarchyLevel ?? null, code],
      );

      if (result.length > 0) {
        totalUpdated += result.length;
        console.log(
          `   ✓ Updated ${result.length} role(s) with code '${code}' → icon:${style.icon} / color:${style.color}`,
        );
      } else {
        console.log(`   ⚠ No role found with code '${code}'`);
      }
    }

    console.log(
      `✅ System roles styles updated: ${totalUpdated} updated, ${totalSkipped} skipped (already set)`,
    );
  } catch (error) {
    console.error('❌ Error updating system roles styles:', error);
    throw error;
  }
}
