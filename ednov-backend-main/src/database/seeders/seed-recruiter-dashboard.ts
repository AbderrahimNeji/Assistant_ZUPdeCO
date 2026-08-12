import { DataSource } from 'typeorm';

/**
 * Seeder pour ajouter des éléments dashboard au rôle RECRUTEUR
 * 
 * Le Recruteur doit avoir accès au dashboard pour que RbacLoader le laisse passer.
 * On lui donne des stats pertinentes pour son rôle (séances, tuteurs, VSC).
 */
export async function seedRecruiterDashboard(ds: DataSource): Promise<void> {
  console.log('📊 Adding dashboard elements for RECRUTEUR role...');
  
  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';
    
    const dashboardElements = [
      'stat-sessions-total',
      'stat-sessions-completed',
      'stat-sessions-hours',
      'stat-reports-pending',
      'stat-students-active',
      'stat-attendance-rate',
    ];
    
    let created = 0;
    
    for (const elementId of dashboardElements) {
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
    
    console.log(`   ✓ Dashboard elements: ${created} créés, ${dashboardElements.length - created} déjà existants`);
    console.log('✅ RECRUTEUR dashboard seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding RECRUTEUR dashboard:', error);
    throw error;
  }
}
