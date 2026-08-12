import { DataSource } from 'typeorm';

/**
 * Seeder pour corriger les accès du rôle RECRUTEUR :
 *
 * 1. Volunteers : ajouter tab-vsc et tab-professor
 * 2. Admins : ajouter action-create (bouton créer un recruteur/professeur)
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRecruiterFixAccess(ds: DataSource): Promise<void> {
  console.log('🔧 Fixing RECRUTEUR access...');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  const bindings = [
    // --- Volunteers : tabs VSC et Professeur ---
    { interface: 'volunteers', elementId: 'tab-vsc', visible: true, order: 1 },
    { interface: 'volunteers', elementId: 'tab-professor', visible: true, order: 2 },

    // --- Admins : bouton de création ---
    { interface: 'admins', elementId: 'action-create', visible: true, order: 0 },
  ];

  let created = 0;

  for (const binding of bindings) {
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
        $4::boolean,
        $5::integer,
        now(),
        now()
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
          WHERE rie.role_id = r.id
            AND rie.element_id = ie.id
        )
      RETURNING id`,
      [companyId, binding.interface, binding.elementId, binding.visible, binding.order],
    );

    if (result.length > 0) {
      console.log(`   ✓ [${binding.interface}] ${binding.elementId} → créé`);
      created++;
    } else {
      console.log(`   - [${binding.interface}] ${binding.elementId} → déjà existant`);
    }
  }

  console.log(`\n✅ RECRUTEUR fix access: ${created}/${bindings.length} bindings créés`);
}
