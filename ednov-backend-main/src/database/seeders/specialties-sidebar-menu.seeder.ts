import { DataSource } from 'typeorm';

export async function seedSpecialtiesSidebarMenu(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding specialties sidebar menu...');

  // 1. Créer l'interface_element sidebar menu-specialties pour chaque company
  await ds.query(`
    INSERT INTO "interface_elements"
      ("id", "company_id", "interface_name", "element_id", "element_type", "element_label",
       "group_label", "group_order", "config", "created_at", "updated_at")
    SELECT
      gen_random_uuid(),
      c.id,
      'sidebar',
      'menu-specialties',
      'menu',
      'Spécialités',
      'Configuration',
      40,
      '{"iconName": "Star", "routePath": "/dashboard/specialties"}'::jsonb,
      now(),
      now()
    FROM "companies" c
    WHERE NOT EXISTS (
      SELECT 1 FROM "interface_elements" ie
      WHERE ie.company_id = c.id
        AND ie.interface_name = 'sidebar'
        AND ie.element_id = 'menu-specialties'
    )
  `);

  console.log('  ✅ interface_elements : menu-specialties inséré');

  // 2. Visible (order=48) pour le rôle admin avec scope unrestricted
  await ds.query(`
    INSERT INTO "role_interface_elements"
      ("id", "company_id", "role_id", "element_id", "visible", "order", "width",
       "visibility_scope", "created_at", "updated_at")
    SELECT
      gen_random_uuid(),
      r.company_id,
      r.id,
      ie.id,
      true,
      48,
      'auto',
      '{"scope": "unrestricted"}'::jsonb,
      now(),
      now()
    FROM "roles" r, "interface_elements" ie
    WHERE r.code = 'admin'
      AND ie.interface_name = 'sidebar'
      AND ie.element_id = 'menu-specialties'
      AND r.company_id = ie.company_id
      AND NOT EXISTS (
        SELECT 1 FROM "role_interface_elements" rie
        WHERE rie.role_id = r.id AND rie.element_id = ie.id
      )
  `);

  console.log('  ✅ role_interface_elements : admin → visible=true');

  // 3. Non visible (order=48) pour les autres rôles
  await ds.query(`
    INSERT INTO "role_interface_elements"
      ("id", "company_id", "role_id", "element_id", "visible", "order", "width",
       "created_at", "updated_at")
    SELECT
      gen_random_uuid(),
      r.company_id,
      r.id,
      ie.id,
      false,
      48,
      'auto',
      now(),
      now()
    FROM "roles" r, "interface_elements" ie
    WHERE r.code IN ('manager', 'coordinator', 'tutor', 'volunteer', 'student')
      AND ie.interface_name = 'sidebar'
      AND ie.element_id = 'menu-specialties'
      AND r.company_id = ie.company_id
      AND NOT EXISTS (
        SELECT 1 FROM "role_interface_elements" rie
        WHERE rie.role_id = r.id AND rie.element_id = ie.id
      )
  `);

  console.log('  ✅ role_interface_elements : autres rôles → visible=false');

  // 4. Ajouter la permission "specialties" dans le JSONB permissions des rôles concernés
  // admin : read + write + delete
  await ds.query(`
    UPDATE "roles"
    SET "permissions" = jsonb_set("permissions", '{specialties}', '["read","write","delete"]'::jsonb)
    WHERE "code" = 'admin'
      AND NOT ("permissions" ? 'specialties')
  `);

  // manager : read + write + delete
  await ds.query(`
    UPDATE "roles"
    SET "permissions" = jsonb_set("permissions", '{specialties}', '["read","write","delete"]'::jsonb)
    WHERE "code" = 'manager'
      AND NOT ("permissions" ? 'specialties')
  `);

  // coordinator : read uniquement
  await ds.query(`
    UPDATE "roles"
    SET "permissions" = jsonb_set("permissions", '{specialties}', '["read"]'::jsonb)
    WHERE "code" = 'coordinator'
      AND NOT ("permissions" ? 'specialties')
  `);

  console.log('  ✅ permissions : specialties ajouté dans les rôles admin, manager, coordinator');

  // 5. Créer les interface_elements d'action pour l'interface "specialties"
  const actions = [
    { elementId: 'action-create',     label: 'Créer une spécialité' },
    { elementId: 'action-edit-row',   label: 'Modifier (ligne)' },
    { elementId: 'action-delete-row', label: 'Désactiver (ligne)' },
  ];

  for (const action of actions) {
    await ds.query(`
      INSERT INTO "interface_elements"
        ("id", "company_id", "interface_name", "element_id", "element_type", "element_label",
         "config", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        c.id,
        'specialties',
        $1::varchar,
        'action',
        $2::varchar,
        '{}',
        now(),
        now()
      FROM "companies" c
      WHERE NOT EXISTS (
        SELECT 1 FROM "interface_elements" ie
        WHERE ie.company_id = c.id
          AND ie.interface_name = 'specialties'
          AND ie.element_id = $1::varchar
      )
    `, [action.elementId, action.label]);
  }

  console.log('  ✅ interface_elements : actions specialties insérées');

  // 6. Lier les actions au rôle admin (visible=true)
  await ds.query(`
    INSERT INTO "role_interface_elements"
      ("id", "company_id", "role_id", "element_id", "visible", "order", "width",
       "created_at", "updated_at")
    SELECT
      gen_random_uuid(),
      r.company_id,
      r.id,
      ie.id,
      true,
      0,
      'auto',
      now(),
      now()
    FROM "roles" r, "interface_elements" ie
    WHERE r.code = 'admin'
      AND ie.interface_name = 'specialties'
      AND ie.element_type = 'action'
      AND r.company_id = ie.company_id
      AND NOT EXISTS (
        SELECT 1 FROM "role_interface_elements" rie
        WHERE rie.role_id = r.id AND rie.element_id = ie.id
      )
  `);

  console.log('  ✅ role_interface_elements : actions → admin visible=true');
  console.log('🎉 Specialties sidebar menu seeded successfully!');
}
