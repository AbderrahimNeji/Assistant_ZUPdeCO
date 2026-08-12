import { DataSource } from 'typeorm';

/**
 * Seeder pour créer l'élément option-edit-tutor dans l'interface 'tutors'.
 * Aligne tutors sur le pattern admins/volunteers qui ont chacun des éléments
 * subtype='edit-role' distincts des éléments subtype='create-role'.
 *
 * Crée :
 * - option-edit-tutor (config: { subtype: 'edit-role', targetRole: 'tutor' })
 *
 * Lie aux mêmes rôles que option-create-tutor :
 * admin, coordinator, manager, recruiter, professor, volunteer
 *
 * Idempotent : safe to run multiple times.
 */
export async function seedTutorsEditOptions(ds: DataSource): Promise<void> {
  console.log('🔧 Creating option-edit-tutor in tutors interface...');

  const companies: Array<{ id: string }> = await ds.query(
    `SELECT DISTINCT company_id AS id FROM interface_elements WHERE interface_name = 'tutors' AND deleted_at IS NULL`,
  );

  if (companies.length === 0) {
    console.log('   ⚠ Aucune company trouvée pour interface tutors — rien à faire');
    return;
  }

  const elementsToCreate = [
    {
      elementId: 'option-edit-tutor',
      elementLabel: 'Tuteur',
      config: { subtype: 'edit-role', targetRole: 'tutor' },
    },
  ];

  const rolesToBind = ['admin', 'coordinator', 'manager', 'recruiter', 'professor', 'volunteer'];

  for (const { id: companyId } of companies) {
    console.log(`\n  company: ${companyId}`);

    for (const el of elementsToCreate) {
      const exists = await ds.query(
        `SELECT id FROM interface_elements
         WHERE element_id = $1 AND interface_name = 'tutors' AND company_id = $2 AND deleted_at IS NULL`,
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

      for (const roleCode of rolesToBind) {
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
  }

  console.log('\n✅ Tutors edit options done');
}
