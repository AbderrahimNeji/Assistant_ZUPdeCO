import { DataSource } from 'typeorm';

/**
 * Fix: Assure que les roles admin/manager/coordinator ont un RIE pour menu-admins
 * dans l'interface 'admins' et pour menu-volunteers dans l'interface 'volunteers'.
 * Sans ça, le backend exclut le menu et les tabs deviennent orphelins.
 */
export async function seedFixMenuAdminsVolunteersRie(dataSource: DataSource): Promise<void> {
  console.log('🔧 [SEED] Fix menu-admins/menu-volunteers RIE pour admin/manager/coordinator...');

  const companyId = '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

  // 1. Insérer/mettre à jour RIE pour menu-admins (interface admins)
  const menuAdminsResult = await dataSource.query(
    `
    INSERT INTO role_interface_elements (id, company_id, role_id, element_id, visible, "order", created_at, updated_at)
    SELECT 
      gen_random_uuid(),
      $1::uuid,
      r.id,
      ie.id,
      true,
      0,
      now(),
      now()
    FROM roles r
    CROSS JOIN interface_elements ie
    WHERE r.code IN ('admin', 'manager', 'coordinator')
      AND r.company_id = $1::uuid
      AND ie.element_id = 'menu-admins'
      AND ie.interface_name = 'admins'
      AND ie.company_id = $1::uuid
      AND NOT EXISTS (
        SELECT 1 FROM role_interface_elements rie
        WHERE rie.role_id = r.id AND rie.element_id = ie.id
      )
    RETURNING id
    `,
    [companyId],
  );

  console.log(`   ✓ menu-admins (admins): ${menuAdminsResult.length} RIE créé(s)`);

  // 2. Mettre à jour visible=true si déjà existant
  const menuAdminsUpdate = await dataSource.query(
    `
    UPDATE role_interface_elements rie
    SET visible = true, updated_at = now()
    FROM roles r, interface_elements ie
    WHERE rie.role_id = r.id
      AND rie.element_id = ie.id
      AND r.code IN ('admin', 'manager', 'coordinator')
      AND r.company_id = $1::uuid
      AND ie.element_id = 'menu-admins'
      AND ie.interface_name = 'admins'
      AND rie.visible = false
    RETURNING rie.id
    `,
    [companyId],
  );

  console.log(`   ✓ menu-admins (admins): ${menuAdminsUpdate.length} RIE mis à jour (visible=true)`);

  // 3. Insérer/mettre à jour RIE pour menu-volunteers (interface volunteers)
  const menuVolunteersResult = await dataSource.query(
    `
    INSERT INTO role_interface_elements (id, company_id, role_id, element_id, visible, "order", created_at, updated_at)
    SELECT 
      gen_random_uuid(),
      $1::uuid,
      r.id,
      ie.id,
      true,
      0,
      now(),
      now()
    FROM roles r
    CROSS JOIN interface_elements ie
    WHERE r.code IN ('admin', 'manager', 'coordinator')
      AND r.company_id = $1::uuid
      AND ie.element_id = 'menu-volunteers'
      AND ie.interface_name = 'volunteers'
      AND ie.company_id = $1::uuid
      AND NOT EXISTS (
        SELECT 1 FROM role_interface_elements rie
        WHERE rie.role_id = r.id AND rie.element_id = ie.id
      )
    RETURNING id
    `,
    [companyId],
  );

  console.log(`   ✓ menu-volunteers (volunteers): ${menuVolunteersResult.length} RIE créé(s)`);

  // 4. Mettre à jour visible=true si déjà existant
  const menuVolunteersUpdate = await dataSource.query(
    `
    UPDATE role_interface_elements rie
    SET visible = true, updated_at = now()
    FROM roles r, interface_elements ie
    WHERE rie.role_id = r.id
      AND rie.element_id = ie.id
      AND r.code IN ('admin', 'manager', 'coordinator')
      AND r.company_id = $1::uuid
      AND ie.element_id = 'menu-volunteers'
      AND ie.interface_name = 'volunteers'
      AND rie.visible = false
    RETURNING rie.id
    `,
    [companyId],
  );

  console.log(`   ✓ menu-volunteers (volunteers): ${menuVolunteersUpdate.length} RIE mis à jour (visible=true)`);

  const total =
    menuAdminsResult.length +
    menuAdminsUpdate.length +
    menuVolunteersResult.length +
    menuVolunteersUpdate.length;

  console.log(`✅ Fix terminé: ${total} RIE créés/mis à jour`);
}
