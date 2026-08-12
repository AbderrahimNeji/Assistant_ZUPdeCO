import { DataSource } from 'typeorm';
import * as data from './data/user-preferences.json';

export async function seedUserPreferences(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding user interface preferences...');
  
  const items = Array.isArray(data) ? data : [];
  
  if (items.length === 0) {
    console.log('⚠️  No user interface preferences data found - please export from Supabase');
    console.log('   Run: SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM user_interface_preferences ORDER BY created_at) t');
    return;
  }

  try {
    for (const item of items) {
      await ds.query(
        `INSERT INTO user_interface_preferences (id, company_id, user_id, is_dark_mode, interface_configs, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING`,
        [item.id,
       item.company_id,
       item.user_id,
       item.is_dark_mode,
       item.interface_configs,
       item.created_at,
       item.updated_at]
      );
    }

    console.log(`✅ Inserted ${items.length} user interface preferences`);
  } catch (error) {
    console.error('❌ Error seeding user interface preferences:', error);
    throw error;
  }
}
