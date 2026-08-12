import { DataSource } from 'typeorm';

/**
 * Seeds default visual and hierarchy metadata for PROFESSOR role.
 * Also ensures tutor role has a hierarchy level.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedProfessorDefaults(ds: DataSource): Promise<void> {
  console.log('🎨 Seeding PROFESSOR role defaults...');

  try {
    // Update PROFESSOR role
    const professorResult = await ds.query(
      `UPDATE roles
       SET icon = $1::varchar,
           color = $2::varchar,
           hierarchy_level = $3::integer,
           updated_at = now()
       WHERE code = $4::varchar
       AND deleted_at IS NULL
       AND (icon IS NULL OR color IS NULL OR hierarchy_level IS NULL)
       RETURNING id, code`,
      ['GraduationCap', 'color-3-nuance-2', 3, 'PROFESSOR'],
    );

    if (professorResult.length > 0) {
      console.log(`   ✓ Updated ${professorResult.length} PROFESSOR role(s)`);
    } else {
      console.log('   ⚠ PROFESSOR role already configured or not found');
    }

    // Update tutor role hierarchy if missing
    const tutorResult = await ds.query(
      `UPDATE roles
       SET hierarchy_level = $1::integer,
           updated_at = now()
       WHERE code = $2::varchar
       AND deleted_at IS NULL
       AND hierarchy_level IS NULL
       RETURNING id, code`,
      [4, 'tutor'],
    );

    if (tutorResult.length > 0) {
      console.log(`   ✓ Updated ${tutorResult.length} tutor role(s) with hierarchy`);
    } else {
      console.log('   ⚠ tutor role already has hierarchy or not found');
    }

    console.log(`✅ PROFESSOR defaults seeded`);
  } catch (error) {
    console.error('❌ Error seeding PROFESSOR defaults:', error);
    throw error;
  }
}
