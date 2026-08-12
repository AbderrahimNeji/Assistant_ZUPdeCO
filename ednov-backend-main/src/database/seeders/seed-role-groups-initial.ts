import { DataSource } from 'typeorm';

/**
 * Seeds initial role groups.
 * Creates the default role groups: admins, steering, operations, service_users, other.
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedRoleGroupsInitial(ds: DataSource): Promise<void> {
  console.log('📦 Seeding initial role groups...');

  const roleGroups = [
    { code: 'admins', label: 'Administrateurs', icon: 'Shield', color: '#7C3AED', groupOrder: 1, isSystem: true },
    { code: 'steering', label: 'Pilotage', icon: 'Compass', color: '#2563EB', groupOrder: 2, isSystem: true },
    { code: 'operations', label: 'Opérations', icon: 'Settings', color: '#059669', groupOrder: 3, isSystem: true },
    { code: 'service_users', label: 'Utilisateurs', icon: 'Users', color: '#D97706', groupOrder: 4, isSystem: true },
    { code: 'other', label: 'Autres', icon: 'Circle', color: '#6B7280', groupOrder: 99, isSystem: false },
  ];

  try {
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const group of roleGroups) {
      const result = await ds.query(
        `INSERT INTO role_groups (company_id, code, label, icon, color, sort_order, is_system, created_at, updated_at)
         SELECT 
           c.id,
           $1::varchar,
           $2::varchar,
           $3::varchar,
           $4::varchar,
           $5::integer,
           $6::boolean,
           now(),
           now()
         FROM companies c
         WHERE NOT EXISTS (
           SELECT 1 FROM role_groups rg
           WHERE rg.company_id = c.id
           AND rg.code = $1::varchar
           AND rg.deleted_at IS NULL
         )
         AND c.deleted_at IS NULL
         RETURNING id, code`,
        [group.code, group.label, group.icon, group.color, group.groupOrder, group.isSystem],
      );

      if (result.length > 0) {
        totalCreated += result.length;
        console.log(`   ✓ Created ${result.length} '${group.code}' role group(s)`);
      } else {
        totalSkipped++;
      }
    }

    console.log(
      `✅ Initial role groups seeded: ${totalCreated} created, ${totalSkipped} already existed`,
    );
  } catch (error) {
    console.error('❌ Error seeding initial role groups:', error);
    throw error;
  }
}
