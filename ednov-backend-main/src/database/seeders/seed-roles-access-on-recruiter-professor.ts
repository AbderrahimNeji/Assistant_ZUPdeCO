import { DataSource } from 'typeorm';

/**
 * Seeder pour définir les accès des autres rôles sur PROFESSOR et RECRUTEUR
 *
 * Qui peut gérer RECRUTEUR ?
 * - Admin: créer, modifier, supprimer
 * - Manager: créer, modifier
 * - Coordinator: voir uniquement
 *
 * Qui peut gérer PROFESSOR ?
 * - Admin: créer, modifier, supprimer
 * - Manager: créer, modifier
 * - Coordinator: créer, modifier (dans ses établissements)
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRolesAccessOnRecruiterProfessor(
  ds: DataSource,
): Promise<void> {
  console.log('🔐 Seeding access rights on RECRUITER and PROFESSOR roles...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // ========================================
    // ACCÈS SUR RECRUTEUR
    // ========================================

    // Admin peut tout faire sur recruteur (tab + actions)
    const adminRecruiterBindings = [
      { elementId: 'tab-recruiter', visible: true, order: 4 },
      { elementId: 'option-create-recruiter', visible: true, order: 0 },
      { elementId: 'option-edit-recruiter', visible: true, order: 0 },
    ];

    let adminRecruiterCount = 0;
    for (const binding of adminRecruiterBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $3::boolean,
          $4::integer,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $2::varchar
          AND ie.interface_name = 'admins'
          AND ie.deleted_at IS NULL
        WHERE r.code = 'admin'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) adminRecruiterCount++;
    }
    console.log(`   ✓ Admin → Recruteur: ${adminRecruiterCount} accès créés`);

    // Manager peut créer et modifier recruteur (pas supprimer)
    const managerRecruiterBindings = [
      { elementId: 'tab-recruiter', visible: true, order: 4 },
      { elementId: 'option-create-recruiter', visible: true, order: 0 },
      { elementId: 'option-edit-recruiter', visible: true, order: 0 },
    ];

    let managerRecruiterCount = 0;
    for (const binding of managerRecruiterBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $3::boolean,
          $4::integer,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $2::varchar
          AND ie.interface_name = 'admins'
          AND ie.deleted_at IS NULL
        WHERE r.code = 'manager'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) managerRecruiterCount++;
    }
    console.log(`   ✓ Manager → Recruteur: ${managerRecruiterCount} accès créés`);

    // Coordinator peut voir recruteur (tab uniquement, pas d'actions)
    const coordinatorRecruiterBindings = [
      { elementId: 'tab-recruiter', visible: true, order: 4 },
    ];

    let coordinatorRecruiterCount = 0;
    for (const binding of coordinatorRecruiterBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $3::boolean,
          $4::integer,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $2::varchar
          AND ie.interface_name = 'admins'
          AND ie.deleted_at IS NULL
        WHERE r.code = 'coordinator'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) coordinatorRecruiterCount++;
    }
    console.log(
      `   ✓ Coordinator → Recruteur: ${coordinatorRecruiterCount} accès créés`,
    );

    // ========================================
    // ACCÈS SUR PROFESSOR
    // ========================================

    // Admin peut tout faire sur professor (tab + actions)
    const adminProfessorBindings = [
      { elementId: 'tab-professor', visible: true, order: 2 },
      { elementId: 'option-create-professor', visible: true, order: 0 },
      { elementId: 'option-edit-professor', visible: true, order: 0 },
    ];

    let adminProfessorCount = 0;
    for (const binding of adminProfessorBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $3::boolean,
          $4::integer,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $2::varchar
          AND ie.interface_name = 'volunteers'
          AND ie.deleted_at IS NULL
        WHERE r.code = 'admin'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) adminProfessorCount++;
    }
    console.log(`   ✓ Admin → Professor: ${adminProfessorCount} accès créés`);

    // Manager peut créer et modifier professor
    const managerProfessorBindings = [
      { elementId: 'tab-professor', visible: true, order: 2 },
      { elementId: 'option-create-professor', visible: true, order: 0 },
      { elementId: 'option-edit-professor', visible: true, order: 0 },
    ];

    let managerProfessorCount = 0;
    for (const binding of managerProfessorBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $3::boolean,
          $4::integer,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $2::varchar
          AND ie.interface_name = 'volunteers'
          AND ie.deleted_at IS NULL
        WHERE r.code = 'manager'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) managerProfessorCount++;
    }
    console.log(`   ✓ Manager → Professor: ${managerProfessorCount} accès créés`);

    // Coordinator peut créer et modifier professor (dans ses établissements)
    const coordinatorProfessorBindings = [
      { elementId: 'tab-professor', visible: true, order: 2 },
      { elementId: 'option-create-professor', visible: true, order: 0 },
      { elementId: 'option-edit-professor', visible: true, order: 0 },
    ];

    let coordinatorProfessorCount = 0;
    for (const binding of coordinatorProfessorBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          visibility_scope,
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $3::boolean,
          $4::integer,
          jsonb_build_object(
            'relations', jsonb_build_array('same_establishment'),
            'logic', 'AND'
          ),
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $2::varchar
          AND ie.interface_name = 'volunteers'
          AND ie.deleted_at IS NULL
        WHERE r.code = 'coordinator'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) coordinatorProfessorCount++;
    }
    console.log(
      `   ✓ Coordinator → Professor: ${coordinatorProfessorCount} accès créés`,
    );

    // Volunteer peut voir professor (tab uniquement)
    const volunteerProfessorBindings = [
      { elementId: 'tab-professor', visible: true, order: 2 },
    ];

    let volunteerProfessorCount = 0;
    for (const binding of volunteerProfessorBindings) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (
          company_id,
          role_id,
          element_id,
          visible,
          "order",
          created_at,
          updated_at
        )
        SELECT
          $1::uuid,
          r.id,
          ie.id,
          $3::boolean,
          $4::integer,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $2::varchar
          AND ie.interface_name = 'volunteers'
          AND ie.deleted_at IS NULL
        WHERE r.code = 'volunteer'
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id
              AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, binding.elementId, binding.visible, binding.order],
      );

      if (result.length > 0) volunteerProfessorCount++;
    }
    console.log(`   ✓ Volunteer → Professor: ${volunteerProfessorCount} accès créés`);

    console.log(
      `✅ Accès sur RECRUTEUR et PROFESSOR configurés pour tous les rôles`,
    );
  } catch (error) {
    console.error(
      '❌ Erreur lors de la configuration des accès sur RECRUTEUR et PROFESSOR:',
      error,
    );
    throw error;
  }
}
