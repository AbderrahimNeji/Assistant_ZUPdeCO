import { DataSource } from 'typeorm';

/**
 * Seeder pour ajouter l'interface element "postits-assigned-tracking"
 * et lier les rôles admin à cet élément.
 *
 * Cet élément contrôle la visibilité du bouton "Suivi" sur les post-its
 * assignés (tracking des assignations par occurrence/période).
 *
 * Rôles ciblés : admin (super admin)
 */
export async function seedPostItsTrackingIe(ds: DataSource): Promise<void> {
  console.log('📊 Seeding postits-assigned-tracking interface element...');

  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

    // 1. Insérer l'interface element si inexistant
    const ieResult = await ds.query(
      `INSERT INTO interface_elements (
        company_id,
        interface_name,
        element_id,
        element_type,
        element_label,
        config,
        created_at,
        updated_at
      )
      VALUES (
        $1::uuid,
        'dashboard',
        'postits-assigned-tracking',
        'action',
        'Suivi des assignations',
        '{"description": "Bouton Suivi sur les post-its assignes"}'::jsonb,
        now(),
        now()
      )
      ON CONFLICT DO NOTHING
      RETURNING id`,
      [companyId],
    );

    if (ieResult.length > 0) {
      console.log(`   ✓ Interface element créé (id: ${ieResult[0].id as string})`);
    } else {
      console.log('   ~ Interface element déjà existant, skip');
    }

    // 2. Lier les rôles admin à cet élément
    const roleCodes = ['admin'];
    let created = 0;

    for (const roleCode of roleCodes) {
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
          true,
          0,
          now(),
          now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = 'postits-assigned-tracking'
          AND ie.interface_name = 'dashboard'
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
        [companyId, roleCode],
      );

      if (result.length > 0) {
        created++;
        console.log(`   ✓ Rôle "${roleCode}" lié à postits-assigned-tracking`);
      } else {
        console.log(`   ~ Rôle "${roleCode}" déjà lié, skip`);
      }
    }

    console.log(
      `   ✓ Bindings RIE: ${created} créés, ${roleCodes.length - created} déjà existants`,
    );
    console.log('✅ postits-assigned-tracking seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding postits-assigned-tracking:', error);
    throw error;
  }
}
