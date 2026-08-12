import { DataSource } from 'typeorm';

/**
 * Seeder pour créer des éléments option-create-* dans l'interface 'volunteers',
 * comme c'est fait dans 'admins' avec option-create-recruiter.
 *
 * Cela permet de découpler "voir un onglet" de "pouvoir créer ce rôle".
 *
 * Crée :
 * - option-create-volunteer  (config: { subtype: 'create-role', targetRole: 'volunteer' })
 * - option-create-professor  (config: { subtype: 'create-role', targetRole: 'professor' })
 *
 * Lie ces éléments aux rôles : admin, manager, coordinator, recruiter
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedVolunteersCreateOptions(ds: DataSource): Promise<void> {
  console.log('🔧 Creating option-create-* elements in volunteers interface...');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  const elementsToCreate = [
    {
      elementId: 'option-create-volunteer',
      elementLabel: 'Créer un VSC',
      config: { subtype: 'create-role', targetRole: 'volunteer' },
    },
    {
      elementId: 'option-create-professor',
      elementLabel: 'Créer un professeur',
      config: { subtype: 'create-role', targetRole: 'professor' },
    },
  ];

  // 1. Créer les IE si inexistants
  for (const el of elementsToCreate) {
    const exists = await ds.query(
      `SELECT id FROM interface_elements WHERE element_id = $1 AND interface_name = 'volunteers' AND company_id = $2 AND deleted_at IS NULL`,
      [el.elementId, companyId],
    );

    if (exists.length === 0) {
      await ds.query(
        `INSERT INTO interface_elements (company_id, interface_name, element_id, element_type, element_label, config, created_at, updated_at)
         VALUES ($1, 'volunteers', $2, 'action', $3, $4::jsonb, now(), now())`,
        [companyId, el.elementId, el.elementLabel, JSON.stringify(el.config)],
      );
      console.log(`   ✓ IE créé: ${el.elementId}`);
    } else {
      console.log(`   - IE déjà existant: ${el.elementId}`);
    }
  }

  // 2. Lier aux rôles
  const rolesToBind = ['admin', 'manager', 'coordinator', 'recruiter'];

  for (const roleCode of rolesToBind) {
    for (const el of elementsToCreate) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (company_id, role_id, element_id, created_at, updated_at)
        SELECT $1::uuid, r.id, ie.id, now(), now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $3::varchar
          AND ie.interface_name = 'volunteers'
          AND ie.deleted_at IS NULL
        WHERE r.code = $2
          AND r.company_id = $1::uuid
          AND r.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM role_interface_elements rie
            WHERE rie.role_id = r.id AND rie.element_id = ie.id
          )
        RETURNING id`,
        [companyId, roleCode, el.elementId],
      );

      if (result.length > 0) {
        console.log(`   ✓ [${roleCode}] ${el.elementId} → lié`);
      } else {
        console.log(`   - [${roleCode}] ${el.elementId} → déjà lié`);
      }
    }
  }

  console.log('✅ Volunteers create options done');
}
