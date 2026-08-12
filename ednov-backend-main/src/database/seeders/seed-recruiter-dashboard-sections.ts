import { DataSource } from 'typeorm';

/**
 * Seeder pour ajouter les SECTIONS dashboard au rôle RECRUTEUR
 * 
 * Les sections permettent d'afficher les widgets avec les listes (Tuteurs, Volontaires, etc.)
 */
export async function seedRecruiterDashboardSections(ds: DataSource): Promise<void> {
  console.log('📊 Adding dashboard SECTIONS for RECRUTEUR role...');
  
  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';
    
    const sections = [
      'section-tutors',
      'section-volunteers',
      'section-sessions',
      'section-reports',
      'section-admins',
    ];
    
    let created = 0;
    
    for (const elementId of sections) {
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
          AND ie.element_id = $2::varchar
          AND ie.interface_name = 'dashboard'
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
        [companyId, elementId],
      );
      
      if (result.length > 0) {
        created++;
      }
    }
    
    console.log(`   ✓ Dashboard sections: ${created} créées, ${sections.length - created} déjà existantes`);
    console.log('✅ RECRUTEUR dashboard sections seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding RECRUTEUR dashboard sections:', error);
    throw error;
  }
}
