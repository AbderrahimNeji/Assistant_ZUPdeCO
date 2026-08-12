import { DataSource } from 'typeorm';
import * as data from './data/interface-elements.json';

export async function seedInterfaceElements(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding interface elements...');

  const elements = Array.isArray(data) ? data : [];

  if (elements.length === 0) {
    console.log('⚠️  No interface elements data found');
    return;
  }

  try {
    // Phase 1 — insert tous sans parent_id (auto-référence)
    for (const elem of elements) {
      await ds.query(
        `INSERT INTO interface_elements (
          id, company_id, interface_name, element_id, element_type, element_label,
          config, created_at, updated_at, deleted_at, group_label, group_icon, group_order, parent_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NULL)
        ON CONFLICT (id) DO NOTHING`,
        [
          elem.id, elem.company_id, elem.interface_name, elem.element_id,
          elem.element_type, elem.element_label, elem.config,
          elem.created_at, elem.updated_at, elem.deleted_at,
          elem.group_label, elem.group_icon, elem.group_order,
        ],
      );
    }

    // Phase 2 — mettre à jour parent_id pour ceux qui en ont un
    const withParent = elements.filter((e: any) => e.parent_id != null);
    for (const elem of withParent) {
      await ds.query(
        `UPDATE interface_elements SET parent_id = $1 WHERE id = $2`,
        [elem.parent_id, elem.id],
      );
    }

    console.log(`✅ Inserted ${elements.length} interface elements (${withParent.length} with parent)`);
  } catch (error) {
    console.error('❌ Error seeding interface elements:', error);
    throw error;
  }
}
