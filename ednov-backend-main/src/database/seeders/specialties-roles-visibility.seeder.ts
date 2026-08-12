import { DataSource } from 'typeorm';

/**
 * Rend la section "Spécialités" visible pour les rôles coordinator et manager :
 *  1. menu-specialties sidebar → visible: true (était false)
 *  2. action-create specialties → INSERT si absent
 *     - manager  : visible: true  (permissions write/delete)
 *     - coordinator : visible: false (permission read only)
 */
export async function seedSpecialtiesRolesVisibility(ds: DataSource): Promise<void> {
  console.log('🌱 Seeding specialties visibility for coordinator & manager...');

  // 1. Activer le menu sidebar pour coordinator et manager
  await ds.query(`
    UPDATE "role_interface_elements" rie
    SET "visible" = true, "updated_at" = now()
    FROM "roles" r, "interface_elements" ie
    WHERE rie.role_id = r.id
      AND rie.element_id = ie.id
      AND r.code IN ('coordinator', 'manager')
      AND ie.interface_name = 'sidebar'
      AND ie.element_id = 'menu-specialties'
      AND rie.visible = false
  `);

  console.log('  ✅ menu-specialties sidebar → visible=true pour coordinator & manager');

  // 2. Ajouter action-create pour manager (visible=true) si absent
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
    WHERE r.code = 'manager'
      AND ie.interface_name = 'specialties'
      AND ie.element_id = 'action-create'
      AND r.company_id = ie.company_id
      AND NOT EXISTS (
        SELECT 1 FROM "role_interface_elements" rie
        WHERE rie.role_id = r.id AND rie.element_id = ie.id
      )
  `);

  console.log('  ✅ specialties/action-create → manager visible=true');

  // 3. Ajouter action-create pour coordinator (visible=false, lecture seule)
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
      0,
      'auto',
      now(),
      now()
    FROM "roles" r, "interface_elements" ie
    WHERE r.code = 'coordinator'
      AND ie.interface_name = 'specialties'
      AND ie.element_id = 'action-create'
      AND r.company_id = ie.company_id
      AND NOT EXISTS (
        SELECT 1 FROM "role_interface_elements" rie
        WHERE rie.role_id = r.id AND rie.element_id = ie.id
      )
  `);

  console.log('  ✅ specialties/action-create → coordinator visible=false (lecture seule)');
  console.log('🎉 Specialties roles visibility seeded successfully!');
}
