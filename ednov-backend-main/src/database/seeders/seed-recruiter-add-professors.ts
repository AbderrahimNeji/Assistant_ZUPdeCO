import { DataSource } from 'typeorm';

/**
 * Seeder pour ajouter l'accès aux PROFESSEURS au rôle RECRUTEUR
 * 
 * Le Recruteur peut maintenant:
 * - Voir le tab professeurs dans admins
 * - Créer des comptes professeurs
 * - Modifier des comptes professeurs
 * 
 * Idempotent: safe to run multiple times.
 */
export async function seedRecruiterAddProfessors(ds: DataSource): Promise<void> {
  console.log('👨‍🏫 Adding PROFESSORS access for RECRUTEUR role...');
  
  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';
    
    const professorBindings = [
      // Tab professeur
      { interface: 'admins', elementId: 'tab-professor', visible: true, order: 5 },
      // Actions pour professeurs
      { interface: 'admins', elementId: 'option-create-professor', visible: true, order: 0 },
      { interface: 'admins', elementId: 'option-edit-professor', visible: true, order: 0 },
    ];
    
    let created = 0;
    
    for (const binding of professorBindings) {
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
        created++;
      }
    }
    
    console.log(`   ✓ Professor bindings: ${created} créés, ${professorBindings.length - created} déjà existants`);
    console.log('✅ RECRUTEUR professor access added successfully');
  } catch (error) {
    console.error('❌ Error adding RECRUTEUR professor access:', error);
    throw error;
  }
}
