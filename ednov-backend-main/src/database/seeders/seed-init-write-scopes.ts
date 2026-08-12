import { DataSource } from 'typeorm';

/**
 * Migration / seeder: initialize write scopes for existing role-interface bindings.
 *
 * Context:
 *   The write scope feature (action-level visibility scope enforcement) was added after
 *   the initial role configuration system. Existing role_interface_elements rows for
 *   action-type elements have no write scope configured (NULL). This is intentional —
 *   NULL means "unrestricted for this action" which preserves existing behavior.
 *
 * What this seeder does:
 *   1. Logs a summary of all action bindings that currently have no write scope.
 *   2. For roles that have a non-null visibility_scope on their READ binding
 *      (e.g. menu-sessions), copies that same scope to all action bindings in the
 *      same interface that currently have NULL write scope.
 *
 *   This "copy from read scope" heuristic is a safe starting point:
 *   - It means "you can only act on entities you can also read" (most common intent).
 *   - Administrators can then override per-action write scopes through the UI.
 *
 * How to run:
 *   npx.cmd ts-node -r tsconfig-paths/register \
 *     src/database/seeders/run-seed-init-write-scopes.ts
 *
 * Safety:
 *   - Idempotent: only updates rows where visibility_scope IS NULL and element_type = 'action'.
 *   - Does NOT overwrite explicitly configured write scopes.
 *   - Can be rolled back by setting visibility_scope = NULL on action bindings.
 *
 * NOTE: This file is a migration artefact — do NOT run it automatically or in CI.
 *       Review the output of the dry-run first, then run with DRY_RUN=false.
 */
export async function seedInitWriteScopes(
  ds: DataSource,
  options: { dryRun?: boolean } = { dryRun: true },
): Promise<void> {
  const { dryRun = true } = options;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Write Scope Initialization Migration`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN (no changes written)' : 'LIVE — changes WILL be written'}`);
  console.log(`${'='.repeat(60)}\n`);

  // ─── Step 1: Audit current state ──────────────────────────────────────────
  const auditRows = await ds.query<
    { companyId: string; companyName: string; roleName: string; roleCode: string; elementId: string; interfaceName: string; currentScope: unknown }[]
  >(`
    SELECT
      c.id                          AS "companyId",
      c.name                        AS "companyName",
      r.name                        AS "roleName",
      r.code                        AS "roleCode",
      ie.element_id                 AS "elementId",
      ie.interface_name             AS "interfaceName",
      rie.visibility_scope          AS "currentScope"
    FROM role_interface_elements rie
    JOIN interface_elements ie  ON ie.id  = rie.interface_element_id
    JOIN roles              r   ON r.id   = rie.role_id
    JOIN companies          c   ON c.id   = r.company_id
    WHERE ie.element_type = 'action'
      AND rie.visibility_scope IS NULL
      AND ie.deleted_at IS NULL
      AND r.deleted_at  IS NULL
      AND c.deleted_at  IS NULL
    ORDER BY c.name, r.name, ie.interface_name, ie.element_id
  `);

  console.log(`Found ${auditRows.length} action binding(s) with no write scope (NULL).\n`);

  if (auditRows.length === 0) {
    console.log('✅ Nothing to migrate — all action bindings already have write scopes configured.');
    return;
  }

  // Group by company for readability
  const byCompany = new Map<string, typeof auditRows>();
  for (const row of auditRows) {
    if (!byCompany.has(row.companyId)) byCompany.set(row.companyId, []);
    byCompany.get(row.companyId)!.push(row);
  }

  for (const [, rows] of byCompany) {
    const company = rows[0];
    console.log(`📦 Company: ${company.companyName} (${company.companyId})`);

    const byRole = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.roleCode;
      if (!byRole.has(key)) byRole.set(key, []);
      byRole.get(key)!.push(row);
    }

    for (const [, roleRows] of byRole) {
      const role = roleRows[0];
      console.log(`  └─ Role: ${role.roleName} (${role.roleCode})`);
      for (const row of roleRows) {
        console.log(`       • ${row.interfaceName} / ${row.elementId} → write_scope: NULL`);
      }
    }
    console.log('');
  }

  // ─── Step 2: Build update plan ─────────────────────────────────────────────
  // For each (role, interface) where a READ binding exists with a non-null scope,
  // propose copying that scope to all NULL action bindings in the same interface.
  const updatePlan = await ds.query<
    { rieId: string; roleName: string; elementId: string; interfaceName: string; sourceScope: unknown }[]
  >(`
    SELECT
      action_rie.id                 AS "rieId",
      r.name                        AS "roleName",
      ie_action.element_id          AS "elementId",
      ie_action.interface_name      AS "interfaceName",
      read_rie.visibility_scope     AS "sourceScope"
    FROM role_interface_elements action_rie
    JOIN interface_elements ie_action ON ie_action.id = action_rie.interface_element_id
    JOIN roles r                       ON r.id         = action_rie.role_id
    -- Find the matching READ (menu/tab) binding for the same interface + role
    JOIN interface_elements ie_read   ON ie_read.interface_name = ie_action.interface_name
                                      AND ie_read.element_type IN ('menu', 'tab')
                                      AND ie_read.deleted_at IS NULL
    JOIN role_interface_elements read_rie ON read_rie.interface_element_id = ie_read.id
                                          AND read_rie.role_id = action_rie.role_id
                                          AND read_rie.visibility_scope IS NOT NULL
    WHERE ie_action.element_type = 'action'
      AND action_rie.visibility_scope IS NULL
      AND ie_action.deleted_at IS NULL
      AND r.deleted_at IS NULL
    ORDER BY r.name, ie_action.interface_name, ie_action.element_id
  `);

  if (updatePlan.length === 0) {
    console.log(
      '⚠️  No matching READ scopes found to copy from.\n' +
      '   Action bindings with NULL write scope will remain unrestricted.\n' +
      '   Configure write scopes manually through the role management UI.',
    );
    return;
  }

  console.log(`\n📋 Update plan (copy read scope → write scope for ${updatePlan.length} binding(s)):\n`);
  for (const row of updatePlan) {
    console.log(
      `  • ${row.roleName} / ${row.interfaceName} / ${row.elementId}` +
      `\n    scope: ${JSON.stringify(row.sourceScope)}\n`,
    );
  }

  if (dryRun) {
    console.log('🔒 DRY RUN — no changes written. Re-run with dryRun=false to apply.');
    return;
  }

  // ─── Step 3: Apply updates ──────────────────────────────────────────────────
  let updated = 0;
  for (const row of updatePlan) {
    await ds.query(
      `UPDATE role_interface_elements
       SET visibility_scope = $1::jsonb,
           updated_at       = now()
       WHERE id = $2
         AND visibility_scope IS NULL`,
      [JSON.stringify(row.sourceScope), row.rieId],
    );
    updated++;
  }

  console.log(`\n✅ Migration complete — ${updated} action binding(s) updated with write scopes.`);
  console.log('   Review and fine-tune write scopes through the role management UI.\n');
}
