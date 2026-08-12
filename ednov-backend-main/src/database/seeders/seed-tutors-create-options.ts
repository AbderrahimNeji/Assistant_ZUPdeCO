import { DataSource } from 'typeorm';

/**
 * Seeder pour créer des éléments option-create-* dans l'interface 'tutors',
 * même pattern que 'admins' et 'volunteers'.
 *
 * Crée :
 * - option-create-tutor (config: { subtype: 'create-role', targetRole: 'tutor' })
 *
 * Les professeurs sont créés depuis l’interface volunteers (option-create-professor).
 *
 * Lie aux rôles : admin, manager, coordinator, recruiter, PROFESSOR
 *
 * Idempotent.
 */
export async function seedTutorsCreateOptions(ds: DataSource): Promise<void> {
  console.log('🔧 Creating option-create-* elements in tutors interface...');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  const elementsToCreate = [
    {
      elementId: 'option-create-tutor',
      elementLabel: 'Créer un tuteur',
      config: { subtype: 'create-role', targetRole: 'tutor' },
    },
  ];

  for (const el of elementsToCreate) {
    const exists = await ds.query(
      `SELECT id FROM interface_elements WHERE element_id = $1 AND interface_name = 'tutors' AND company_id = $2 AND deleted_at IS NULL`,
      [el.elementId, companyId],
    );

    if (exists.length === 0) {
      await ds.query(
        `INSERT INTO interface_elements (company_id, interface_name, element_id, element_type, element_label, config, created_at, updated_at)
         VALUES ($1, 'tutors', $2, 'action', $3, $4::jsonb, now(), now())`,
        [companyId, el.elementId, el.elementLabel, JSON.stringify(el.config)],
      );
      console.log(`   ✓ IE créé: ${el.elementId}`);
    } else {
      console.log(`   - IE déjà existant: ${el.elementId}`);
    }
  }

  const rolesToBind = ['admin', 'manager', 'coordinator', 'recruiter', 'PROFESSOR'];

  for (const roleCode of rolesToBind) {
    for (const el of elementsToCreate) {
      const result = await ds.query(
        `INSERT INTO role_interface_elements (company_id, role_id, element_id, created_at, updated_at)
        SELECT $1::uuid, r.id, ie.id, now(), now()
        FROM roles r
        INNER JOIN interface_elements ie
          ON ie.company_id = r.company_id
          AND ie.element_id = $3::varchar
          AND ie.interface_name = 'tutors'
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

  console.log('✅ Tutors create options done');
}
