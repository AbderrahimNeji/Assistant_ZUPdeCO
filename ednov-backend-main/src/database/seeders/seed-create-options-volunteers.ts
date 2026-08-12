import { DataSource } from 'typeorm';

/**
 * Seeder pour créer les options de création manquantes dans l'interface volunteers
 *
 * Crée:
 * - option-create-volunteer (pour créer un VSC)
 * - option-create-professor (pour créer un professeur) - déjà existe mais on vérifie
 *
 * Et lie ces options aux rôles admin, manager, coordinator
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedCreateOptionsVolunteers(ds: DataSource): Promise<void> {
  console.log('📝 Creating volunteer creation options...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // Récupérer le parent_id (menu-volunteers)
    const parentResult = await ds.query(
      `SELECT id FROM interface_elements 
       WHERE element_id = 'menu-volunteers' 
       AND company_id = $1::uuid 
       AND deleted_at IS NULL 
       LIMIT 1`,
      [companyId],
    );

    if (parentResult.length === 0) {
      console.log('   ⚠ Menu volunteers parent non trouvé, skip');
      return;
    }

    const parentId = parentResult[0].id;

    // 1. Créer option-create-volunteer si n'existe pas
    const volunteerOptionResult = await ds.query(
      `INSERT INTO interface_elements (
        company_id,
        interface_name,
        element_id,
        element_type,
        element_label,
        config,
        parent_id,
        created_at,
        updated_at
      )
      SELECT
        $1::uuid,
        'volunteers',
        'option-create-volunteer',
        'action',
        'VSC',
        jsonb_build_object(
          'subtype', 'create-role',
          'targetRole', 'volunteer'
        ),
        $2::uuid,
        now(),
        now()
      WHERE NOT EXISTS (
        SELECT 1 FROM interface_elements
        WHERE element_id = 'option-create-volunteer'
        AND company_id = $1::uuid
      )
      RETURNING id, element_id`,
      [companyId, parentId],
    );

    if (volunteerOptionResult.length > 0) {
      console.log(`   ✓ Option créée: option-create-volunteer`);
    } else {
      console.log(`   ⚠ option-create-volunteer existe déjà`);
    }

    // 2. Créer option-create-professor si n'existe pas (normalement existe déjà)
    const professorOptionResult = await ds.query(
      `INSERT INTO interface_elements (
        company_id,
        interface_name,
        element_id,
        element_type,
        element_label,
        config,
        parent_id,
        created_at,
        updated_at
      )
      SELECT
        $1::uuid,
        'volunteers',
        'option-create-professor',
        'action',
        'Professeur',
        jsonb_build_object(
          'subtype', 'create-role',
          'targetRole', 'PROFESSOR'
        ),
        $2::uuid,
        now(),
        now()
      WHERE NOT EXISTS (
        SELECT 1 FROM interface_elements
        WHERE element_id = 'option-create-professor'
        AND company_id = $1::uuid
      )
      RETURNING id, element_id`,
      [companyId, parentId],
    );

    if (professorOptionResult.length > 0) {
      console.log(`   ✓ Option créée: option-create-professor`);
    } else {
      console.log(`   ⚠ option-create-professor existe déjà`);
    }

    // 3. Lier ces options aux rôles admin, manager, coordinator
    const roles = ['admin', 'manager', 'coordinator'];
    const options = ['option-create-volunteer', 'option-create-professor'];

    for (const roleCode of roles) {
      for (const optionId of options) {
        const rieResult = await ds.query(
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
            true,
            0,
            now(),
            now()
          FROM roles r
          INNER JOIN interface_elements ie
            ON ie.company_id = r.company_id
            AND ie.element_id = $3::varchar
            AND ie.interface_name = 'volunteers'
            AND ie.deleted_at IS NULL
          WHERE r.code = $2::varchar
            AND r.company_id = $1::uuid
            AND r.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM role_interface_elements rie
              WHERE rie.role_id = r.id
                AND rie.element_id = ie.id
            )
          RETURNING id`,
          [companyId, roleCode, optionId],
        );

        if (rieResult.length > 0) {
          console.log(`   ✓ ${roleCode} → ${optionId}`);
        }
      }
    }

    // 4. Créer aussi les options d'édition
    const editVolunteerResult = await ds.query(
      `INSERT INTO interface_elements (
        company_id,
        interface_name,
        element_id,
        element_type,
        element_label,
        config,
        parent_id,
        created_at,
        updated_at
      )
      SELECT
        $1::uuid,
        'volunteers',
        'option-edit-volunteer',
        'action',
        'VSC',
        jsonb_build_object(
          'subtype', 'edit-role',
          'targetRole', 'volunteer'
        ),
        $2::uuid,
        now(),
        now()
      WHERE NOT EXISTS (
        SELECT 1 FROM interface_elements
        WHERE element_id = 'option-edit-volunteer'
        AND company_id = $1::uuid
      )
      RETURNING id, element_id`,
      [companyId, parentId],
    );

    if (editVolunteerResult.length > 0) {
      console.log(`   ✓ Option créée: option-edit-volunteer`);
    }

    const editProfessorResult = await ds.query(
      `INSERT INTO interface_elements (
        company_id,
        interface_name,
        element_id,
        element_type,
        element_label,
        config,
        parent_id,
        created_at,
        updated_at
      )
      SELECT
        $1::uuid,
        'volunteers',
        'option-edit-professor',
        'action',
        'Professeur',
        jsonb_build_object(
          'subtype', 'edit-role',
          'targetRole', 'PROFESSOR'
        ),
        $2::uuid,
        now(),
        now()
      WHERE NOT EXISTS (
        SELECT 1 FROM interface_elements
        WHERE element_id = 'option-edit-professor'
        AND company_id = $1::uuid
      )
      RETURNING id, element_id`,
      [companyId, parentId],
    );

    if (editProfessorResult.length > 0) {
      console.log(`   ✓ Option créée: option-edit-professor`);
    }

    // Lier les options d'édition aux rôles
    const editOptions = ['option-edit-volunteer', 'option-edit-professor'];
    for (const roleCode of roles) {
      for (const optionId of editOptions) {
        await ds.query(
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
            true,
            0,
            now(),
            now()
          FROM roles r
          INNER JOIN interface_elements ie
            ON ie.company_id = r.company_id
            AND ie.element_id = $3::varchar
            AND ie.interface_name = 'volunteers'
            AND ie.deleted_at IS NULL
          WHERE r.code = $2::varchar
            AND r.company_id = $1::uuid
            AND r.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM role_interface_elements rie
              WHERE rie.role_id = r.id
                AND rie.element_id = ie.id
            )`,
          [companyId, roleCode, optionId],
        );
      }
    }

    console.log(`✅ Options de création/édition volunteers créées`);
  } catch (error) {
    console.error('❌ Erreur lors de la création des options volunteers:', error);
    throw error;
  }
}
