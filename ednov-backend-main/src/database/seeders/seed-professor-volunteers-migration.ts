import { DataSource } from 'typeorm';

/**
 * Seeder pour migrer le rôle PROFESSOR vers le groupe 'volunteers'
 * et mettre à jour ses accès selon les spécifications
 *
 * Accès PROFESSOR:
 * ✅ Créer classes/spécialités/salles dans ses établissements d'affectation
 * ✅ Créer des séances dans ses établissements
 * ✅ Voir et modifier uniquement SES séances (où il est professeur)
 * ✅ Rédiger/modifier/voir CR uniquement sur SES séances
 * ✅ Créer/modifier élèves
 * ✅ Créer/modifier/supprimer tuteurs
 * ✅ Créer/modifier VSC
 *
 * ❌ Pas de validation des CR
 * ❌ Pas de création/modification de comptes utilisateurs
 * ❌ Pas de suppression de VSC
 * ❌ Pas d'export de données
 * ❌ Pas de validation des rapports journaliers VSC
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedProfessorVolunteersMigration(
  ds: DataSource,
): Promise<void> {
  console.log('🎯 Migrating PROFESSOR role to volunteers group...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    await ds.query(
      `UPDATE interface_elements ie
       SET interface_name = 'volunteers',
           parent_id = mv.id,
           updated_at = now()
       FROM interface_elements mv
       WHERE ie.company_id = $1::uuid
         AND mv.company_id = ie.company_id
         AND mv.interface_name = 'volunteers'
         AND mv.element_id = 'menu-volunteers'
         AND mv.deleted_at IS NULL
         AND ie.element_id = 'tab-professor'
         AND ie.interface_name <> 'volunteers'
         AND ie.deleted_at IS NULL`,
      [companyId],
    );

    // 1. Migrer le rôle professor vers le groupe volunteers
    const roleResult = await ds.query(
      `UPDATE roles
       SET role_group = 'volunteers',
           permissions = jsonb_build_object(
             'pairs', ARRAY['read', 'write'],
             'tutors', ARRAY['read', 'write', 'delete'],
             'volunteers', ARRAY['read', 'write'],
             'reports', ARRAY['read', 'write'],
             'calendar', ARRAY['read', 'write'],
             'matching', ARRAY['read', 'write'],
             'sessions', ARRAY['read', 'write'],
             'students', ARRAY['read', 'write'],
             'dashboard', ARRAY['read', 'write'],
             'vsc-reports', ARRAY['read'],
             'establishments', ARRAY['read', 'write'],
             'rooms', ARRAY['read', 'write'],
             'specialties', ARRAY['read', 'write'],
             'school-classes', ARRAY['read', 'write']
           ),
           icon = 'BookUser',
           color = 'color-1-nuance-3',
           hierarchy_level = 2,
           updated_at = now()
       WHERE LOWER(code) = 'professor'
         AND company_id = $1::uuid
         AND deleted_at IS NULL
       RETURNING id, code, role_group`,
      [companyId],
    );

    if (roleResult.length > 0) {
      console.log(
        `   ✓ Rôle PROFESSOR migré vers groupe: ${roleResult[0].role_group}`,
      );
    } else {
      console.log('   ⚠ Rôle PROFESSOR non trouvé ou déjà migré');
    }

    // 2. Créer l'élément tab pour professor dans l'interface volunteers (s'il n'existe pas)
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
        'volunteers',
        'tab-professor',
        'tab',
        'Professeur',
        jsonb_build_object(
          'icon', 'BookUser',
          'tabValue', 'professor',
          'targetRoleCode', 'PROFESSOR'
        ),
        (SELECT id FROM interface_elements WHERE element_id = 'menu-volunteers' AND company_id = $1::uuid LIMIT 1)
      WHERE EXISTS (SELECT 1 FROM companies WHERE id = $1::uuid)
      AND NOT EXISTS (
        SELECT 1 FROM interface_elements
        WHERE element_id = 'tab-professor'
        AND company_id = $1::uuid
        AND interface_name = 'volunteers'
        AND deleted_at IS NULL
      )
      RETURNING id, element_id`,
      [companyId],
    );

    if (tabResult.length > 0) {
      console.log(`   ✓ Tab professor créé: ${tabResult[0].element_id}`);
    } else {
      console.log(`   ⚠ Tab professor existe déjà`);
    }

    // 3. Créer les actions de création et édition pour professor dans volunteers
    const actionsToCreate = [
      {
        elementId: 'option-create-professor',
        label: 'Professeur',
        subtype: 'create-role',
        targetRole: 'PROFESSOR',
      },
      {
        elementId: 'option-edit-professor',
        label: 'Professeur',
        subtype: 'edit-role',
        targetRole: 'PROFESSOR',
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
          'volunteers',
          $2::varchar,
          'action',
          $3::varchar,
          jsonb_build_object(
            'subtype', $4::varchar,
            'targetRole', $5::varchar
          ),
          (SELECT id FROM interface_elements WHERE element_id = 'menu-volunteers' AND company_id = $1::uuid LIMIT 1)
        WHERE EXISTS (SELECT 1 FROM companies WHERE id = $1::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM interface_elements
          WHERE element_id = $2::varchar
          AND company_id = $1::uuid
          AND interface_name = 'volunteers'
          AND deleted_at IS NULL
        )
        RETURNING id, element_id`,
        [companyId, action.elementId, action.label, action.subtype, action.targetRole],
      );

      if (actionResult.length > 0) {
        console.log(`   ✓ Action créée: ${actionResult[0].element_id}`);
      }
    }

    console.log(`✅ Rôle PROFESSOR migré vers volunteers avec succès`);
  } catch (error) {
    console.error(
      '❌ Erreur lors de la migration du rôle PROFESSOR vers volunteers:',
      error,
    );
    throw error;
  }
}
