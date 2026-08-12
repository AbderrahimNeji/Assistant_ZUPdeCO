import { DataSource } from 'typeorm';

export async function seedFixMenuVisibility(dataSource: DataSource): Promise<void> {
  console.log('🔧 Fixing menu visibility for admin roles...');

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

    // Get role IDs for admin, manager, coordinator
    const rolesResult = await queryRunner.query(
      `SELECT id, code FROM roles WHERE company_id = $1 AND code IN ('admin', 'manager', 'coordinator')`,
      [companyId]
    );

    if (rolesResult.length === 0) {
      throw new Error('No admin roles found');
    }

    // Get menu elements (menu-admins, menu-volunteers)
    const menusResult = await queryRunner.query(
      `SELECT id, element_id, interface_name FROM interface_elements 
       WHERE company_id = $1 AND element_id IN ('menu-admins', 'menu-volunteers')`,
      [companyId]
    );

    if (menusResult.length === 0) {
      throw new Error('No menu elements found');
    }

    let inserted = 0;
    let updated = 0;

    for (const role of rolesResult) {
      for (const menu of menusResult) {
        // Check if RIE exists
        const existingRie = await queryRunner.query(
          `SELECT id, visible FROM role_interface_elements 
           WHERE company_id = $1 AND role_id = $2 AND element_id = $3`,
          [companyId, role.id, menu.id]
        );

        if (existingRie.length === 0) {
          // Insert new RIE with visible=true, order=0
          await queryRunner.query(
            `INSERT INTO role_interface_elements 
             (id, company_id, role_id, element_id, visible, "order", created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, true, 0, NOW(), NOW())`,
            [companyId, role.id, menu.id]
          );
          inserted++;
          console.log(`  ✓ Created RIE: role=${role.code}, menu=${menu.element_id}, interface=${menu.interface_name}`);
        } else if (existingRie[0].visible !== true) {
          // Update to visible=true
          await queryRunner.query(
            `UPDATE role_interface_elements SET visible = true, updated_at = NOW() WHERE id = $1`,
            [existingRie[0].id]
          );
          updated++;
          console.log(`  ✓ Updated RIE: role=${role.code}, menu=${menu.element_id}, interface=${menu.interface_name} → visible=true`);
        } else {
          console.log(`  ⊘ Skipped (already visible): role=${role.code}, menu=${menu.element_id}`);
        }
      }
    }

    await queryRunner.commitTransaction();
    console.log(`✅ Menu visibility fixed: ${inserted} inserted, ${updated} updated`);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error fixing menu visibility:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}
