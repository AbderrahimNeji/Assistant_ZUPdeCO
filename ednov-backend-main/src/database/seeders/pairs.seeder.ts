import { DataSource } from 'typeorm';
import * as data from './data/pairs.json';

export async function seedPairs(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding student-tutor pairs...');
  
  const items = Array.isArray(data) ? data : [];
  
  if (items.length === 0) {
    console.log('⚠️  No student-tutor pairs data found - please export from Supabase');
    console.log('   Run: SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM core_pairs ORDER BY created_at) t');
    return;
  }

  try {
    for (const item of items) {
      await ds.query(
        `INSERT INTO core_pairs (id, company_id, student_user_id, tutor_user_id, establishment_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING`,
        [item.id,
       item.company_id,
       item.student_user_id,
       item.tutor_user_id,
       item.establishment_id,
       item.created_at,
       item.updated_at]
      );
    }

    console.log(`✅ Inserted ${items.length} student-tutor pairs`);
  } catch (error) {
    console.error('❌ Error seeding student-tutor pairs:', error);
    throw error;
  }
}
