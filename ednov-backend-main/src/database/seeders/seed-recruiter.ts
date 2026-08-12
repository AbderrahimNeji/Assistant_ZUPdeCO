import { DataSource } from 'typeorm';

/**
 * Seeder pour le rôle RECRUTEUR
 * - Créé dans le groupe 'admins'
 * - Accès: voir séances, CR, créer/modifier/supprimer tuteurs et VSC,
 *   créer/modifier comptes recruteurs, exporter données
 * - Pas d'accès: créer classes/séances, gérer élèves, valider CR, gérer rapports VSC
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRecruiter(ds: DataSource): Promise<void> {
  console.log('🎯 Seeding RECRUTEUR role...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // 1. Vérifier si le rôle existe déjà
    const existingRole = await ds.query(
      `SELECT id FROM roles WHERE company_id = $1::uuid AND code = 'recruiter' AND deleted_at IS NULL`,
      [companyId],
    );

    if (existingRole.length > 0) {
      // Mettre à jour le rôle existant
      const updateResult = await ds.query(
        `UPDATE roles
         SET label = 'Recruteur',
             description = 'Gestion des profils tuteurs et VSC. Création, modification et export des données utilisateurs.',
             permissions = jsonb_build_object(
               'tutors', ARRAY['read', 'write', 'delete'],
               'volunteers', ARRAY['read', 'write', 'delete'],
               'sessions', ARRAY['read'],
               'reports', ARRAY['read'],
               'users', ARRAY['read', 'write'],
               'export', ARRAY['read']
             ),
             role_group = 'admins',
             hierarchy_level = 2,
             icon = 'UserSearch',
             color = 'color-2-nuance-2',
             updated_at = now()
         WHERE id = $1::uuid
         RETURNING id, code`,
        [existingRole[0].id],
      );
      console.log(`   ✓ Rôle RECRUTEUR mis à jour: ${updateResult[0].id}`);
    } else {
      // Créer le nouveau rôle
      const insertResult = await ds.query(
        `INSERT INTO roles (
          company_id,
          code,
          label,
          description,
          is_system,
          is_default,
          permissions,
          status,
          role_group,
          hierarchy_level,
          icon,
          color
        )
        VALUES (
          $1::uuid,
          'recruiter',
          'Recruteur',
          'Gestion des profils tuteurs et VSC. Création, modification et export des données utilisateurs.',
          false,
          false,
          jsonb_build_object(
            'tutors', ARRAY['read', 'write', 'delete'],
            'volunteers', ARRAY['read', 'write', 'delete'],
            'sessions', ARRAY['read'],
            'reports', ARRAY['read'],
            'users', ARRAY['read', 'write'],
            'export', ARRAY['read']
          ),
          'active',
          'admins',
          2,
          'UserSearch',
          'color-2-nuance-2'
        )
        RETURNING id, code`,
        [companyId],
      );
      console.log(`   ✓ Rôle RECRUTEUR créé: ${insertResult[0].id}`);
    }

    // 2. Créer l'élément tab pour recruteur dans l'interface admins (s'il n'existe pas)
    const tabResult = await ds.query(
      `INSERT INTO interface_elements (
        company_id,
        interface_name,
        element_id,
        element_type,
        element_label,
        config,
        parent_id
      )
      SELECT
        $1::uuid,
        'admins',
        'tab-recruiter',
        'tab',
        'Recruteur',
        jsonb_build_object(
          'icon', 'UserSearch',
          'tabValue', 'recruiter',
          'targetRoleCode', 'recruiter'
        ),
        (SELECT id FROM interface_elements WHERE element_id = 'menu-admins' AND company_id = $1::uuid LIMIT 1)
      WHERE EXISTS (SELECT 1 FROM companies WHERE id = $1::uuid)
      AND NOT EXISTS (
        SELECT 1 FROM interface_elements
        WHERE element_id = 'tab-recruiter'
        AND company_id = $1::uuid
      )
      RETURNING id, element_id`,
      ['354eb5d0-17a4-4906-8b27-7c6339bdcd70'],
    );

    if (tabResult.length > 0) {
      console.log(`   ✓ Tab recruteur créé: ${tabResult[0].element_id}`);
    } else {
      console.log(`   ⚠ Tab recruteur existe déjà`);
    }

    // 3. Créer les actions de création et édition pour recruteur
    const actionsToCreate = [
      {
        elementId: 'option-create-recruiter',
        label: 'Recruteur',
        subtype: 'create-role',
        targetRole: 'recruiter',
      },
      {
        elementId: 'option-edit-recruiter',
        label: 'Recruteur',
        subtype: 'edit-role',
        targetRole: 'recruiter',
      },
    ];

    for (const action of actionsToCreate) {
      const actionResult = await ds.query(
        `INSERT INTO interface_elements (
          company_id,
          interface_name,
          element_id,
          element_type,
          element_label,
          config,
          parent_id
        )
        SELECT
          $1::uuid,
          'admins',
          $2::varchar,
          'action',
          $3::varchar,
          jsonb_build_object(
            'subtype', $4::varchar,
            'targetRole', $5::varchar
          ),
          (SELECT id FROM interface_elements WHERE element_id = 'menu-admins' AND company_id = $1::uuid LIMIT 1)
        WHERE EXISTS (SELECT 1 FROM companies WHERE id = $1::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM interface_elements
          WHERE element_id = $2::varchar
          AND company_id = $1::uuid
        )
        RETURNING id, element_id`,
        [
          '354eb5d0-17a4-4906-8b27-7c6339bdcd70',
          action.elementId,
          action.label,
          action.subtype,
          action.targetRole,
        ],
      );

      if (actionResult.length > 0) {
        console.log(`   ✓ Action créée: ${actionResult[0].element_id}`);
      }
    }

    console.log(`✅ Rôle RECRUTEUR seedé avec succès`);
  } catch (error) {
    console.error('❌ Erreur lors du seeding du rôle RECRUTEUR:', error);
    throw error;
  }
}
