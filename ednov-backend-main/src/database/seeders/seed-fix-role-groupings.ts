import { DataSource } from 'typeorm';

/**
 * Fixes role group assignments for coordinator, manager, and PROFESSOR roles.
 * Moves their tabs in interface_elements to the correct interface name.
 *
 * This seeder:
 * 1. Updates coordinator, manager → role_group = 'admins'
 * 2. Updates PROFESSOR → role_group = 'volunteers'
 * 3. Moves tab-coordinator, tab-manager from 'steering' interface to 'admins'
 * 4. Moves tab-professor from any non-volunteers interface to 'volunteers'
 * 5. Updates parent_id to point to correct menu-* element
 *
 * Idempotent: safe to run multiple times.
 */
export async function seedFixRoleGroupings(ds: DataSource): Promise<void> {
  console.log('🔄 Fixing role group assignments and interface elements...');

  try {
    // ─── 1. Update roles table ───────────────────────────────────────────────
    console.log('  1️⃣ Updating roles...');
    
    const roleUpdates: Array<{ code: string; newGroup: string }> = [
      { code: 'coordinator', newGroup: 'admins' },
      { code: 'manager', newGroup: 'admins' },
      { code: 'PROFESSOR', newGroup: 'volunteers' },
      { code: 'professor', newGroup: 'volunteers' },
    ];

    let totalRolesUpdated = 0;

    for (const { code, newGroup } of roleUpdates) {
      const result = await ds.query(
        `UPDATE roles
         SET role_group = $1::varchar,
             updated_at = now()
         WHERE code = $2::varchar
         AND deleted_at IS NULL
         AND role_group != $1::varchar
         RETURNING id, code, role_group`,
        [newGroup, code],
      );

      if (result.length > 0) {
        totalRolesUpdated += result.length;
        console.log(`     ✓ Updated ${result.length} role(s) '${code}' → role_group: '${newGroup}'`);
      } else {
        console.log(`     ⚠ No update needed for '${code}' (already '${newGroup}' or not found)`);
      }
    }

    // ─── 2. Update interface_elements tabs ──────────────────────────────────────
    console.log('  2️⃣ Moving interface element tabs...');

    // First, get menu-admins and menu-volunteers IDs for tab parents
    const menuAdminsResult = await ds.query(
      `SELECT id FROM interface_elements 
       WHERE interface_name = $1::varchar 
       AND element_id = $2::varchar 
       AND deleted_at IS NULL 
       LIMIT 1`,
      ['admins', 'menu-admins'],
    );

    const menuVolunteersResult = await ds.query(
      `SELECT id FROM interface_elements 
       WHERE interface_name = $1::varchar 
       AND element_id = $2::varchar 
       AND deleted_at IS NULL 
       LIMIT 1`,
      ['volunteers', 'menu-volunteers'],
    );

    const menuAdminsId = menuAdminsResult[0]?.id;
    const menuVolunteersId = menuVolunteersResult[0]?.id;

    if (!menuAdminsId) {
      console.warn('     ⚠ menu-admins not found, skipping coordinator/manager tab updates');
    }

    if (!menuVolunteersId) {
      console.warn('     ⚠ menu-volunteers not found, skipping tab-professor updates');
    }

    let totalTabsUpdated = 0;

    // Move coordinator and manager tabs to admins interface
    if (menuAdminsId) {
      const tabsToMoveToAdmins = ['tab-coordinator', 'tab-manager'];
      
      for (const tabId of tabsToMoveToAdmins) {
        const result = await ds.query(
          `UPDATE interface_elements
           SET interface_name = $1::varchar,
               parent_id = $2::uuid,
               updated_at = now()
           WHERE element_id = $3::varchar
           AND deleted_at IS NULL
           AND interface_name != $1::varchar
           RETURNING id, element_id, interface_name`,
          ['admins', menuAdminsId, tabId],
        );

        if (result.length > 0) {
          totalTabsUpdated += result.length;
          console.log(`     ✓ Moved ${result.length} tab(s) '${tabId}' → interface: 'admins'`);
        } else {
          console.log(`     ⚠ No update needed for '${tabId}' (already in 'admins' or not found)`);
        }
      }
    }

    // Move tab-professor under volunteers (never tutors)
    if (menuVolunteersId) {
      const result = await ds.query(
        `UPDATE interface_elements
         SET interface_name = $1::varchar,
             parent_id = $2::uuid,
             updated_at = now()
         WHERE element_id = $3::varchar
         AND deleted_at IS NULL
         AND interface_name != $1::varchar
         RETURNING id, element_id, interface_name`,
        ['volunteers', menuVolunteersId, 'tab-professor'],
      );

      if (result.length > 0) {
        totalTabsUpdated += result.length;
        console.log(`     ✓ Moved ${result.length} tab(s) 'tab-professor' → interface: 'volunteers'`);
      } else {
        console.log(`     ⚠ No update needed for 'tab-professor' (already in 'volunteers' or not found)`);
      }
    }

    console.log(`✅ Role grouping fix completed: ${totalRolesUpdated} roles, ${totalTabsUpdated} tabs updated`);
  } catch (error) {
    console.error('❌ Error fixing role groupings:', error);
    throw error;
  }
}
