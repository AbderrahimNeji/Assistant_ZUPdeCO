import { DataSource } from 'typeorm';

/**
 * Seeder pour corriger les tabs du rôle RECRUTEUR
 *
 * Ajoute les tabs manquants dans volunteers et admins.
 * tab-vsc n'existe pas en BD, les vrais tabs volunteers sont: tab-volunteer, tab-professor
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRecruiterFixTabs(ds: DataSource): Promise<void> {
  console.log('🔧 Fixing RECRUTEUR tabs...');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  const bindings = [
    // Volunteers : tab-volunteer (VSC = volunteers dans la BD)
    { interface: 'volunteers', elementId: 'tab-volunteer', visible: true, order: 1 },
    // Admins : tab-professor (pour voir/créer des professeurs)
    { interface: 'admins', elementId: 'tab-professor', visible: true, order: 5 },
  ];

  for (const binding of bindings) {
    const result = await ds.query(
      `INSERT INTO role_interface_elements (
        company_id, role_id, element_id, visible, "order", created_at, updated_at
      )
      SELECT $1::uuid, r.id, ie.id, $4::boolean, $5::integer, now(), now()
      FROM roles r
      INNER JOIN interface_elements ie
        ON ie.company_id = r.company_id
        AND ie.element_id = $3::varchar
        AND ie.interface_name = $2::varchar
        AND ie.deleted_at IS NULL
      WHERE r.code = 'recruiter'
        AND r.company_id = $1::uuid
        AND r.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM role_interface_elements rie
          WHERE rie.role_id = r.id AND rie.element_id = ie.id
        )
      RETURNING id`,
      [companyId, binding.interface, binding.elementId, binding.visible, binding.order],
    );

    if (result.length > 0) {
      console.log(`   ✓ [${binding.interface}] ${binding.elementId} → créé`);
    } else {
      console.log(`   - [${binding.interface}] ${binding.elementId} → déjà existant`);
    }
  }

  console.log('✅ RECRUTEUR tabs fixed');
}
