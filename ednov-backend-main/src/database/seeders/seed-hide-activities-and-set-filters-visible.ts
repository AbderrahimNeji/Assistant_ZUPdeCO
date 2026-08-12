import { DataSource } from 'typeorm';

/**
 * Seeder pour:
 * 1. Masquer les interfaces "Activités" et "Types d'Activités" pour Manager et Coordinateur
 * 2. Rendre tous les filtres de toutes les interfaces visibles par défaut (displayed)
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedHideActivitiesAndSetFiltersVisible(dataSource: DataSource): Promise<void> {
  console.log('🔧 Hiding activities interfaces and setting all filters visible...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    // Get company_id (assuming single company setup)
    const companyResult = await queryRunner.query(`SELECT id FROM companies LIMIT 1`);
    if (!companyResult.length) {
      throw new Error('No company found');
    }
    const companyId = companyResult[0].id;

    console.log(`📦 Using company ID: ${companyId}`);

    // ========== PARTIE 1: Masquer les menus Activités pour Manager et Coordinateur ==========
    console.log('\n--- PARTIE 1: Masquer les menus Activités ---');

    // Get role IDs for manager and coordinator
    const rolesResult = await queryRunner.query(
      `SELECT id, code, label FROM roles 
       WHERE company_id = $1 AND code IN ('manager', 'coordinator')
       ORDER BY code`,
      [companyId]
    );

    if (rolesResult.length === 0) {
      console.warn('⚠️  No manager or coordinator roles found');
    } else {
      console.log(`✓ Found ${rolesResult.length} roles: ${rolesResult.map((r: any) => r.code).join(', ')}`);
    }

    // Get menu elements for activities
    const menusResult = await queryRunner.query(
      `SELECT id, element_id, interface_name, element_label 
       FROM interface_elements 
       WHERE company_id = $1 
         AND element_id IN ('menu-activities', 'menu-activity-types')
         AND element_type = 'menu'
       ORDER BY element_id`,
      [companyId]
    );

    if (menusResult.length === 0) {
      console.warn('⚠️  No activity menu elements found');
    } else {
      console.log(`✓ Found ${menusResult.length} menu elements: ${menusResult.map((m: any) => m.element_id).join(', ')}`);
    }

    let hiddenCount = 0;
    let alreadyHiddenCount = 0;

    for (const role of rolesResult) {
      for (const menu of menusResult) {
        // Check if RIE exists
        const existingRie = await queryRunner.query(
          `SELECT id, visible FROM role_interface_elements 
           WHERE company_id = $1 AND role_id = $2 AND element_id = $3`,
          [companyId, role.id, menu.id]
        );

        if (existingRie.length === 0) {
          // Insert new RIE with visible=false
          await queryRunner.query(
            `INSERT INTO role_interface_elements 
             (id, company_id, role_id, element_id, visible, "order", created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, false, 999, NOW(), NOW())`,
            [companyId, role.id, menu.id]
          );
          hiddenCount++;
          console.log(`  ✓ Masqué: role=${role.code} (${role.label}), menu=${menu.element_id} (${menu.element_label})`);
        } else if (existingRie[0].visible !== false) {
          // Update to visible=false
          await queryRunner.query(
            `UPDATE role_interface_elements 
             SET visible = false, updated_at = NOW() 
             WHERE id = $1`,
            [existingRie[0].id]
          );
          hiddenCount++;
          console.log(`  ✓ Masqué: role=${role.code} (${role.label}), menu=${menu.element_id} (${menu.element_label})`);
        } else {
          alreadyHiddenCount++;
          console.log(`  ⊘ Déjà masqué: role=${role.code}, menu=${menu.element_id}`);
        }
      }
    }

    console.log(`\n✅ Menus activités masqués: ${hiddenCount} modifiés, ${alreadyHiddenCount} déjà masqués`);

    // ========== PARTIE 2: Rendre tous les filtres visibles par défaut ==========
    console.log('\n--- PARTIE 2: Rendre tous les filtres visibles ---');

    // Get all filter elements
    const filtersResult = await queryRunner.query(
      `SELECT id, element_id, interface_name, element_label 
       FROM interface_elements 
       WHERE company_id = $1 
         AND element_type = 'filter'
       ORDER BY interface_name, element_id`,
      [companyId]
    );

    console.log(`✓ Found ${filtersResult.length} filter elements`);

    // Get all roles
    const allRolesResult = await queryRunner.query(
      `SELECT id, code, label FROM roles 
       WHERE company_id = $1 
       ORDER BY code`,
      [companyId]
    );

    console.log(`✓ Found ${allRolesResult.length} roles`);

    let filtersUpdated = 0;
    let filtersCreated = 0;
    let filtersAlreadyVisible = 0;

    for (const role of allRolesResult) {
      for (const filter of filtersResult) {
        // Check if RIE exists
        const existingRie = await queryRunner.query(
          `SELECT id, visible FROM role_interface_elements 
           WHERE company_id = $1 AND role_id = $2 AND element_id = $3`,
          [companyId, role.id, filter.id]
        );

        if (existingRie.length === 0) {
          // Insert new RIE with visible=true
          await queryRunner.query(
            `INSERT INTO role_interface_elements 
             (id, company_id, role_id, element_id, visible, "order", created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, true, 0, NOW(), NOW())`,
            [companyId, role.id, filter.id]
          );
          filtersCreated++;
        } else if (existingRie[0].visible !== true) {
          // Update to visible=true
          await queryRunner.query(
            `UPDATE role_interface_elements 
             SET visible = true, updated_at = NOW() 
             WHERE id = $1`,
            [existingRie[0].id]
          );
          filtersUpdated++;
        } else {
          filtersAlreadyVisible++;
        }
      }
    }

    console.log(`  ✓ Filtres créés: ${filtersCreated}`);
    console.log(`  ✓ Filtres mis à jour: ${filtersUpdated}`);
    console.log(`  ⊘ Déjà visibles: ${filtersAlreadyVisible}`);
    console.log(`\n✅ Tous les filtres sont maintenant visibles par défaut`);

    await queryRunner.commitTransaction();

    console.log('\n🎉 Seeder terminé avec succès!');
    console.log(`   - Menus activités masqués pour Manager et Coordinateur`);
    console.log(`   - Tous les filtres configurés comme visibles par défaut`);

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error in seeder:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
