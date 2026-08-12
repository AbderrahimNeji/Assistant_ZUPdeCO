import { DataSource } from 'typeorm';

/**
 * Seeds minimal role-interface-element bindings for PROFESSOR role.
 * Grants read access to tutors, sessions, and reports with same_establishment scope.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedProfessorBindings(ds: DataSource): Promise<void> {
  console.log('🔐 Seeding PROFESSOR role bindings...');

  const bindings = [
    { interfaceName: 'tutors', elementId: 'action-view-row' },
    { interfaceName: 'sessions', elementId: 'action-view-row' },
    { interfaceName: 'reports', elementId: 'action-view-row' },
  ];

  try {
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const binding of bindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
           company_id,
           role_id,
           element_id,
           visibility_scope,
           created_at,
           updated_at
         )
         SELECT 
           r.company_id,
           r.id,
           ie.id,
           jsonb_build_object(
             'relations', jsonb_build_array('same_establishment'),
             'logic', 'AND'
           ),
           now(),
           now()
         FROM roles r
         INNER JOIN interface_elements ie
           ON ie.company_id = r.company_id
           AND ie.element_id = $1::varchar
           AND ie.interface_name = $2::varchar
           AND ie.deleted_at IS NULL
         WHERE r.code = 'PROFESSOR'
         AND r.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM role_interface_elements rie
           WHERE rie.role_id = r.id
           AND rie.element_id = ie.id
         )
         RETURNING id`,
        [binding.elementId, binding.interfaceName],
      );

      if (result.length > 0) {
        totalCreated += result.length;
        console.log(
          `   ✓ Created ${result.length} binding(s) for ${binding.elementId} on ${binding.interfaceName}`,
        );
      } else {
        totalSkipped++;
      }
    }

    if (totalCreated === 0 && totalSkipped === bindings.length) {
      console.log('   ⚠ All bindings already exist or PROFESSOR role not found');
    }

    console.log(
      `✅ PROFESSOR bindings seeded: ${totalCreated} created, ${totalSkipped} skipped`,
    );
  } catch (error) {
    console.error('❌ Error seeding PROFESSOR bindings:', error);
    throw error;
  }
}
