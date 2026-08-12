import { DataSource } from 'typeorm';
import * as data from './data/roles.json';

export async function seedRoles(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding roles...');
  
  const roles = Array.isArray(data) ? data : [];
  
  if (roles.length === 0) {
    console.log('⚠️  No roles data found');
    return;
  }

  try {
    for (const role of roles) {
      await ds.query(
        `INSERT INTO roles (
          id, company_id, code, label, description, is_system, is_default,
          permissions, status, created_at, updated_at, deleted_at, role_group
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING`,
        [
          role.id, role.company_id, role.code, role.label, role.description,
          role.is_system, role.is_default, role.permissions, role.status,
          role.created_at, role.updated_at, role.deleted_at, role.role_group,
        ]
      );
    }

    console.log(`✅ Inserted ${roles.length} roles`);
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    throw error;
  }
}
