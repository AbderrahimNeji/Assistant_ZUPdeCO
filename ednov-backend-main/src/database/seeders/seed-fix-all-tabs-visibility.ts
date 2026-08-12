import { DataSource } from 'typeorm';

/**
 * Seeder pour corriger TOUS les problèmes de visibilité des tabs
 * dans les interfaces admins et volunteers
 *
 * Problèmes corrigés:
 * - tab-volunteer avec visible=null pour manager et coordinator
 * - Tous les tabs et menus avec visible=null
 * - Tous les tabs sans order défini
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedFixAllTabsVisibility(ds: DataSource): Promise<void> {
  console.log('🔧 Fixing ALL tabs visibility issues...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // 1. Corriger TOUS les tabs avec visible=null dans admins et volunteers
    const fixNullVisibility = await ds.query(
      `UPDATE role_interface_elements
       SET visible = true,
           "order" = COALESCE("order", 0),
           updated_at = now()
       FROM roles r, interface_elements ie
       WHERE role_interface_elements.role_id = r.id
         AND role_interface_elements.element_id = ie.id
         AND r.company_id = $1::uuid
         AND ie.interface_name IN ('admins', 'volunteers', 'sidebar')
         AND ie.element_type IN ('tab', 'menu')
         AND role_interface_elements.visible IS NULL
       RETURNING role_interface_elements.id`,
      [companyId],
    );

    console.log(`   ✓ Corrigé ${fixNullVisibility.length} éléments avec visible=null`);

    // 2. S'assurer que manager a accès aux tabs volunteers
    const managerTabs = [
      { element_id: 'tab-volunteer', order: 1 },
      { element_id: 'tab-professor', order: 2 },
    ];

    for (const tab of managerTabs) {
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
          $3::integer,
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
        ON CONFLICT DO NOTHING`,
        [companyId, tab.element_id, tab.order],
      );

      // Mettre à jour si existe déjà
      await ds.query(
        `UPDATE role_interface_elements
         SET visible = true,
             "order" = $3::integer,
             updated_at = now()
         FROM roles r, interface_elements ie
         WHERE role_interface_elements.role_id = r.id
           AND role_interface_elements.element_id = ie.id
           AND r.code = 'manager'
           AND r.company_id = $1::uuid
           AND ie.element_id = $2::varchar
           AND ie.interface_name = 'volunteers'
           AND (role_interface_elements.visible IS NULL OR role_interface_elements.visible = false)`,
        [companyId, tab.element_id, tab.order],
      );
    }

    console.log(`   ✓ Manager: accès aux tabs volunteers vérifié`);

    // 3. S'assurer que coordinator a accès aux tabs volunteers
    const coordinatorTabs = [
      { element_id: 'tab-volunteer', order: 1 },
      { element_id: 'tab-professor', order: 2 },
    ];

    for (const tab of coordinatorTabs) {
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
          $3::integer,
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
        ON CONFLICT DO NOTHING`,
        [companyId, tab.element_id, tab.order],
      );

      // Mettre à jour si existe déjà
      await ds.query(
        `UPDATE role_interface_elements
         SET visible = true,
             "order" = $3::integer,
             updated_at = now()
         FROM roles r, interface_elements ie
         WHERE role_interface_elements.role_id = r.id
           AND role_interface_elements.element_id = ie.id
           AND r.code = 'coordinator'
           AND r.company_id = $1::uuid
           AND ie.element_id = $2::varchar
           AND ie.interface_name = 'volunteers'
           AND (role_interface_elements.visible IS NULL OR role_interface_elements.visible = false)`,
        [companyId, tab.element_id, tab.order],
      );
    }

    console.log(`   ✓ Coordinator: accès aux tabs volunteers vérifié`);

    // 4. S'assurer que admin a tout visible
    const adminFix = await ds.query(
      `UPDATE role_interface_elements
       SET visible = true,
           updated_at = now()
       FROM roles r, interface_elements ie
       WHERE role_interface_elements.role_id = r.id
         AND role_interface_elements.element_id = ie.id
         AND r.code = 'admin'
         AND r.company_id = $1::uuid
         AND ie.interface_name IN ('admins', 'volunteers', 'sidebar')
         AND ie.element_type IN ('tab', 'menu', 'action')
         AND (role_interface_elements.visible IS NULL OR role_interface_elements.visible = false)
       RETURNING role_interface_elements.id`,
      [companyId],
    );

    console.log(`   ✓ Admin: ${adminFix.length} éléments rendus visibles`);

    console.log(`✅ Tous les problèmes de visibilité des tabs corrigés`);
  } catch (error) {
    console.error('❌ Erreur lors de la correction des tabs:', error);
    throw error;
  }
}
