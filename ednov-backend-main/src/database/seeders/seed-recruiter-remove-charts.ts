import { DataSource } from 'typeorm';

/**
 * Seeder pour retirer l'accès aux graphiques (charts) au rôle RECRUTEUR
 * 
 * Supprime les bindings pour:
 * - chart-sessions-distribution
 * - chart-sessions-evolution
 * - chart-sessions-by-establishment
 * - chart-resources-by-establishment
 * 
 * Idempotent: safe to run multiple times.
 */
export async function seedRecruiterRemoveCharts(ds: DataSource): Promise<void> {
  console.log('📊 Removing chart access for RECRUTEUR role...');
  
  try {
    const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';
    
    const chartElementIds = [
      'chart-sessions-distribution',
      'chart-sessions-evolution',
      'chart-sessions-by-establishment',
      'chart-resources-by-establishment',
    ];
    
    let deleted = 0;
    
    for (const elementId of chartElementIds) {
      const result = await ds.query(
        `DELETE FROM role_interface_elements rie
        USING roles r, interface_elements ie
        WHERE rie.role_id = r.id
          AND rie.element_id = ie.id
          AND r.code = 'recruiter'
          AND r.company_id = $1::uuid
          AND ie.element_id = $2::varchar
          AND ie.deleted_at IS NULL
        RETURNING rie.id`,
        [companyId, elementId],
      );
      
      deleted += result.length;
    }
    
    console.log(`   ✓ Chart bindings removed: ${deleted}`);
    console.log('✅ RECRUTEUR chart access removed successfully');
  } catch (error) {
    console.error('❌ Error removing RECRUTEUR chart access:', error);
    throw error;
  }
}
