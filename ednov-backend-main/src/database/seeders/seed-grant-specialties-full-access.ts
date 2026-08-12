import { DataSource } from 'typeorm';

/**
 * Seeder pour accorder tous les accès aux spécialités pour coordinator et manager
 *
 * Spécifications :
 * - Accorder tous les éléments d'interface liés aux spécialités (menu, filtres, actions)
 * - Coordinator : tous les accès en lecture/écriture (comme manager)
 * - Manager : tous les accès déjà présents + ceux manquants
 * - Pas de visibility_scope particulier pour l'instant (null)
 *
 * Éléments concernés:
 * - menu-specialties (sidebar)
 * - establishment-specialties (establishments filter)
 * - filter-specialties (students filter)
 * - action-create (specialties)
 * - action-edit-row (specialties)
 * - action-delete-row (specialties)
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedGrantSpecialtiesFullAccess(ds: DataSource): Promise<void> {
  console.log('🌱 Accord de tous les accès spécialités pour coordinator & manager...\n');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  try {
    // 1. S'assurer que tous les éléments d'interface spécialités existent pour coordinator ET manager
    console.log('Étape 1: Création des bindings manquants pour tous les éléments spécialités...');

    const elementIds = [
      'menu-specialties',
      'establishment-specialties',
      'filter-specialties',
      'action-create',
      'action-edit-row',
      'action-delete-row',
    ];

    const roleCodes = ['coordinator', 'manager'];

    for (const roleCode of roleCodes) {
      console.log(`\n  → Traitement du rôle: ${roleCode}`);

      for (const elementId of elementIds) {
        const result = await ds.query(
          `
          INSERT INTO "role_interface_elements"
            ("id", "company_id", "role_id", "element_id", "visible", "order", "width",
             "visibility_scope", "created_at", "updated_at")
          SELECT
            gen_random_uuid(),
            r.company_id,
            r.id,
            ie.id,
            true,
            CASE 
              WHEN ie.element_id = 'menu-specialties' THEN 48
              ELSE 0
            END,
            'auto',
            NULL,
            now(),
            now()
          FROM "roles" r
          CROSS JOIN "interface_elements" ie
          WHERE r.code = $1
            AND r.company_id = $2
            AND ie.company_id = $2
            AND (
              (ie.element_id = $3 AND ie.element_id LIKE '%specialt%')
              OR (ie.interface_name = 'specialties' AND ie.element_id = $3)
              OR (ie.interface_name IN ('establishments', 'students') AND ie.element_id = $3)
            )
            AND NOT EXISTS (
              SELECT 1 FROM "role_interface_elements" rie
              WHERE rie.role_id = r.id 
                AND rie.element_id = ie.id
            )
          RETURNING id
        `,
          [roleCode, companyId, elementId],
        );

        if (result.length > 0) {
          console.log(`    ✓ ${elementId} → créé pour ${roleCode}`);
        } else {
          console.log(`    ⚠ ${elementId} → déjà existant pour ${roleCode}`);
        }
      }
    }

    // 2. S'assurer que tous les éléments sont visibles (visible = true)
    console.log('\n\nÉtape 2: Activation de la visibilité pour tous les éléments...');

    const updateResult = await ds.query(
      `
      UPDATE "role_interface_elements" rie
      SET 
        "visible" = true,
        "visibility_scope" = NULL,
        "updated_at" = now()
      FROM "roles" r, "interface_elements" ie
      WHERE rie.role_id = r.id
        AND rie.element_id = ie.id
        AND r.code IN ('coordinator', 'manager')
        AND r.company_id = $1
        AND (
          (ie.interface_name = 'sidebar' AND ie.element_id = 'menu-specialties')
          OR (ie.interface_name = 'establishments' AND ie.element_id = 'establishment-specialties')
          OR (ie.interface_name = 'students' AND ie.element_id = 'filter-specialties')
          OR (ie.interface_name = 'specialties' AND ie.element_id IN ('action-create', 'action-edit-row', 'action-delete-row'))
        )
        AND (rie.visible = false OR rie.visibility_scope IS NOT NULL)
      RETURNING rie.id
    `,
      [companyId],
    );

    if (updateResult.length > 0) {
      console.log(`  ✓ ${updateResult.length} élément(s) mis à jour (visible=true, visibility_scope=null)`);
    } else {
      console.log(`  ⚠ Tous les éléments sont déjà visibles et sans scope`);
    }

    // 3. Vérification finale
    console.log('\n\nÉtape 3: Vérification finale...');

    for (const roleCode of roleCodes) {
      const checkResult = await ds.query(
        `
        SELECT 
          r.code as role_code,
          ie.interface_name,
          ie.element_id,
          ie.element_type,
          rie.visible,
          rie.visibility_scope
        FROM "role_interface_elements" rie
        JOIN "roles" r ON rie.role_id = r.id
        JOIN "interface_elements" ie ON rie.element_id = ie.id
        WHERE r.code = $1
          AND r.company_id = $2
          AND (
            (ie.interface_name = 'sidebar' AND ie.element_id = 'menu-specialties')
            OR (ie.interface_name = 'establishments' AND ie.element_id = 'establishment-specialties')
            OR (ie.interface_name = 'students' AND ie.element_id = 'filter-specialties')
            OR (ie.interface_name = 'specialties' AND ie.element_id IN ('action-create', 'action-edit-row', 'action-delete-row'))
          )
        ORDER BY ie.interface_name, ie.element_id
      `,
        [roleCode, companyId],
      );

      console.log(`\n  ${roleCode} - Accès spécialités:`);
      checkResult.forEach((row) => {
        const status = row.visible ? '✓' : '✗';
        const scope = row.visibility_scope ? ` [scope: ${JSON.stringify(row.visibility_scope)}]` : '';
        console.log(`    ${status} ${row.interface_name}/${row.element_id} (${row.element_type})${scope}`);
      });

      if (checkResult.length < 6) {
        console.warn(`    ⚠ Attention: ${checkResult.length}/6 éléments trouvés pour ${roleCode}`);
      }
    }

    console.log('\n\n✅ Terminé - Tous les accès spécialités accordés à coordinator et manager\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'accord des accès spécialités:', error);
    throw error;
  }
}
