import { DataSource } from 'typeorm';
import * as data from './data/role-interface-elements.json';

export async function seedRoleInterfaceElements(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding role-interface relationships...');
  
  const items = Array.isArray(data) ? data : [];
  
  if (items.length === 0) {
    console.log('⚠️  No role-interface relationships data found - please export from Supabase');
    console.log('   Run: SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM role_interface_elements ORDER BY created_at) t');
    return;
  }

  const emptyToNull = (v: unknown) =>
    v === '' || v === undefined ? null : v;
  const toInt = (v: unknown, fallback = 0) => {
    if (v === '' || v === null || v === undefined) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const toBool = (v: unknown, fallback = true) => {
    if (v === '' || v === null || v === undefined) return fallback;
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 't' || v === 1 || v === '1') return true;
    if (v === 'false' || v === 'f' || v === 0 || v === '0') return false;
    return fallback;
  };

  try {
    let inserted = 0;
    let skipped = 0;
    for (const item of items) {
      try {
        await ds.query(
          `INSERT INTO role_interface_elements (id, company_id, role_id, element_id, created_at, updated_at, visibility_scope, "order", visible, width)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING`,
          [
            item.id,
            item.company_id,
            item.role_id,
            item.element_id,
            item.created_at,
            item.updated_at,
            emptyToNull(item.visibility_scope),
            toInt(item.order, 0),
            toBool(item.visible, true),
            emptyToNull(item.width),
          ],
        );
        inserted += 1;
      } catch (rowError: any) {
        // Skip rows referencing missing roles/elements or other local DB mismatches
        skipped += 1;
        continue;
      }
    }

    console.log(
      `✅ Inserted/attempted ${inserted} role-interface relationships (skipped ${skipped} bad/FK rows)`,
    );
  } catch (error) {
    console.error('❌ Error seeding role-interface relationships:', error);
    throw error;
  }
}
