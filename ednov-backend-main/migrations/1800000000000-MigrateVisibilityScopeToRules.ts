import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Convert legacy visibility_scope format to new rules[] schema.
 *
 * Strategy:
 * 1. For each role_interface_elements row with element_type='menu' and non-null visibility_scope:
 *    - Convert the legacy scope format to the new rules[] format
 *    - Collect all actions from the same interface_name that are enabled for this role
 *    - Build a rules array with a default rule and optional specific rules (from entityConditions)
 * 
 * 2. For all role_interface_elements rows with element_type != 'menu':
 *    - Clear visibility_scope to {} (actions/filters/tabs don't use scopes)
 *
 * Run with DRY_RUN=1 environment variable to preview changes without applying them.
 */
export class MigrateVisibilityScopeToRules1800000000000 implements MigrationInterface {
  private dryRun = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    this.dryRun = process.env.DRY_RUN === '1';

    if (this.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be applied\n');
    }

    // Step 1: Get all interface_elements grouped by interface_name
    const interfaceElements = await queryRunner.query(`
      SELECT id, interface_name, element_id, element_type, element_label
      FROM interface_elements
      WHERE deleted_at IS NULL
      ORDER BY interface_name, element_type
    `);

    // Group by interface_name
    const elementsByInterface: Record<string, any[]> = {};
    for (const el of interfaceElements) {
      if (!elementsByInterface[el.interface_name]) {
        elementsByInterface[el.interface_name] = [];
      }
      elementsByInterface[el.interface_name].push(el);
    }

    // Step 2: Process each role's interface bindings
    const roleBindings = await queryRunner.query(`
      SELECT rie.id, rie.role_id, rie.element_id, rie.visibility_scope,
             ie.interface_name, ie.element_type, ie.element_id as element_code
      FROM role_interface_elements rie
      INNER JOIN interface_elements ie ON ie.id = rie.element_id
      INNER JOIN roles r ON r.id = rie.role_id
      WHERE ie.deleted_at IS NULL AND r.deleted_at IS NULL
      ORDER BY r.code, ie.interface_name, ie.element_type
    `);

    // Group by role_id and interface_name
    const bindingsByRoleAndInterface: Record<string, Record<string, any[]>> = {};
    for (const binding of roleBindings) {
      if (!bindingsByRoleAndInterface[binding.role_id]) {
        bindingsByRoleAndInterface[binding.role_id] = {};
      }
      if (!bindingsByRoleAndInterface[binding.role_id][binding.interface_name]) {
        bindingsByRoleAndInterface[binding.role_id][binding.interface_name] = [];
      }
      bindingsByRoleAndInterface[binding.role_id][binding.interface_name].push(binding);
    }

    let menuUpdates = 0;
    let scopeClears = 0;

    // Step 3: For each role + interface, convert menu binding to rules[]
    for (const [roleId, interfaces] of Object.entries(bindingsByRoleAndInterface)) {
      for (const [interfaceName, bindings] of Object.entries(interfaces)) {
        const menuBinding = bindings.find((b) => b.element_type === 'menu');
        const actionBindings = bindings.filter((b) => b.element_type === 'action');

        if (menuBinding && menuBinding.visibility_scope) {
          const legacyScope = menuBinding.visibility_scope;
          const rules = this.convertLegacyScopeToRules(legacyScope, actionBindings);
          const newScope = { rules };

          if (this.dryRun) {
            console.log(`[DRY RUN] Would update menu binding for role ${roleId}, interface ${interfaceName}`);
            console.log(`  Old scope:`, JSON.stringify(legacyScope, null, 2));
            console.log(`  New scope:`, JSON.stringify(newScope, null, 2));
          } else {
            await queryRunner.query(
              `UPDATE role_interface_elements SET visibility_scope = $1 WHERE id = $2`,
              [JSON.stringify(newScope), menuBinding.id]
            );
            menuUpdates++;
          }
        }

        // Clear visibility_scope for all non-menu elements
        for (const binding of actionBindings) {
          if (binding.visibility_scope && Object.keys(binding.visibility_scope).length > 0) {
            if (this.dryRun) {
              console.log(`[DRY RUN] Would clear scope for ${binding.element_type} ${binding.element_code}`);
            } else {
              await queryRunner.query(
                `UPDATE role_interface_elements SET visibility_scope = NULL WHERE id = $1`,
                [binding.id]
              );
              scopeClears++;
            }
          }
        }
      }
    }

    // Step 4: Clear scopes for filters and tabs
    const nonActionElements = await queryRunner.query(`
      SELECT rie.id, ie.element_type, ie.element_id
      FROM role_interface_elements rie
      INNER JOIN interface_elements ie ON ie.id = rie.element_id
      WHERE ie.element_type IN ('filter', 'tab', 'stat_card', 'chart', 'table', 'widget')
        AND rie.visibility_scope IS NOT NULL
        AND jsonb_typeof(rie.visibility_scope) != 'null'
    `);

    for (const el of nonActionElements) {
      if (this.dryRun) {
        console.log(`[DRY RUN] Would clear scope for ${el.element_type} ${el.element_id}`);
      } else {
        await queryRunner.query(
          `UPDATE role_interface_elements SET visibility_scope = NULL WHERE id = $1`,
          [el.id]
        );
        scopeClears++;
      }
    }

    if (this.dryRun) {
      console.log(`\n✅ DRY RUN COMPLETE`);
      console.log(`   - Would update ${menuUpdates} menu bindings`);
      console.log(`   - Would clear ${scopeClears} non-menu scopes`);
    } else {
      console.log(`\n✅ MIGRATION COMPLETE`);
      console.log(`   - Updated ${menuUpdates} menu bindings to rules[] format`);
      console.log(`   - Cleared ${scopeClears} non-menu scopes`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('⚠️  Rollback not implemented - manual restoration required from backup');
  }

  /**
   * Converts legacy visibility_scope format to new rules[] format.
   */
  private convertLegacyScopeToRules(legacyScope: any, actionBindings: any[]): any[] {
    const rules: any[] = [];

    // Collect enabled action IDs
    const enabledActionIds = actionBindings.map((b) => b.element_code);

    // Default rule from top-level scope
    const defaultRule: any = {
      id: 'rule-default',
      entityFilter: null,
      read:
        legacyScope.relations && legacyScope.relations.length > 0
          ? {
              relations: legacyScope.relations,
              logic: legacyScope.operator || legacyScope.logic || 'OR',
            }
          : null,
      actions: enabledActionIds,
    };

    rules.push(defaultRule);

    // Specific rules from entityConditions
    if (legacyScope.entityConditions && Array.isArray(legacyScope.entityConditions)) {
      for (let i = 0; i < legacyScope.entityConditions.length; i++) {
        const cond = legacyScope.entityConditions[i];
        rules.push({
          id: `rule-${i + 1}`,
          entityFilter: {
            field: cond.field,
            operator: cond.operator || 'in',
            values: cond.values || [],
          },
          read: cond.scope
            ? {
                relations: cond.scope.relations || cond.relations || [],
                logic: cond.scope.operator || cond.scope.logic || cond.operator || 'OR',
              }
            : null,
          actions: enabledActionIds, // For now, all actions apply to all rules
        });
      }
    }

    return rules;
  }
}
