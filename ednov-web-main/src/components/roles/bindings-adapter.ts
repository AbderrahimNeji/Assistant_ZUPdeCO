/**
 * Adapter to convert between the new rules-based format (RoleBindingRules)
 * and the legacy RoleBinding[] format expected by the backend API.
 */

import type { RoleBinding } from './RoleAccessMatrix';
import type { RoleBindingRules, RoleBindingRule, RuleReadScope } from '@/types/role.types';
import type { InterfaceElement } from '@/types/interface-elements.types';

/**
 * Builds the menu binding for a module.
 * elementId must be the UUID (interface_elements.id) — the backend validates @IsUUID().
 */
function buildMenuBinding(menuEl: InterfaceElement, rules: RoleBindingRule[]): RoleBinding {
  return {
    elementId: menuEl.id,
    enabled: true,
    visibilityScope: convertRulesToLegacyScope(rules),
  };
}

/**
 * Builds action bindings from the rules.
 * rule.actions stores varchar elementIds (from ActionsChecklist); we resolve each to its UUID.
 * rule.writeScopes contains the write scope per action.
 */
function buildActionBindings(
  elements: InterfaceElement[],
  rules: RoleBindingRule[],
): RoleBinding[] {
  const varcharIds = new Set<string>();
  for (const rule of rules) {
    for (const id of rule.actions) {
      varcharIds.add(id);
    }
  }

  // Collect write scopes from all rules (last rule wins if conflict)
  const writeScopesByAction: Record<string, RuleReadScope | null> = {};
  for (const rule of rules) {
    if (rule.writeScopes) {
      Object.assign(writeScopesByAction, rule.writeScopes);
    }
  }

  const result: RoleBinding[] = [];
  for (const varcharId of varcharIds) {
    const el = elements.find((e) => e.elementId === varcharId && e.elementType === 'action');
    if (el) {
      const ws = writeScopesByAction[varcharId] ?? null;
      result.push({
        elementId: el.id,
        enabled: true,
        visibilityScope: ws
          ? convertRulesToLegacyScope([
              { id: 'rule-default', entityFilter: null, read: ws, actions: [] },
            ])
          : null,
      });
    }
  }
  return result;
}

/**
 * Builds bindings for all elements of a given type (filter only now, tabs handled separately).
 * elementId is the UUID (interface_elements.id).
 */
function buildElementTypeBindings(elements: InterfaceElement[], type: 'filter'): RoleBinding[] {
  return elements
    .filter((el) => el.elementType === type)
    .map((el) => ({ elementId: el.id, enabled: true, visibilityScope: null }));
}

/**
 * Builds tab bindings based on selected tabs.
 * If selectedTabs is undefined/null, includes all tabs (default behavior).
 * If selectedTabs is an array, only includes tabs whose elementId is in that array.
 */
function buildTabBindings(
  elements: InterfaceElement[],
  selectedTabs?: string[] | null,
): RoleBinding[] {
  const tabs = elements.filter((el) => el.elementType === 'tab');
  const filtered =
    selectedTabs != null ? tabs.filter((el) => selectedTabs.includes(el.elementId)) : tabs;
  return filtered.map((el) => ({ elementId: el.id, enabled: true, visibilityScope: null }));
}

/**
 * Converts the new rules-based format to the legacy RoleBinding[] format.
 *
 * Strategy:
 * - For each active module (interfaceName), emit bindings for: menu (with scope),
 *   selected actions, all filters, and all tabs.
 * - All elementId values are UUIDs (interface_elements.id) as required by the backend.
 */
export function convertRulesToLegacyBindings(
  rulesMap: Record<string, RoleBindingRules>,
  interfaceElements: Record<string, InterfaceElement[]>,
): RoleBinding[] {
  const bindings: RoleBinding[] = [];

  for (const [interfaceName, rulesData] of Object.entries(rulesMap)) {
    const elements = interfaceElements[interfaceName] ?? [];
    const menuEl = elements.find((el) => el.elementType === 'menu');
    if (!menuEl) {
      console.warn(`No menu element found for interface: ${interfaceName}`);
      continue;
    }

    bindings.push(
      buildMenuBinding(menuEl, rulesData.rules),
      ...buildActionBindings(elements, rulesData.rules),
      ...buildElementTypeBindings(elements, 'filter'),
      ...buildTabBindings(elements, rulesData.tabs),
    );
  }

  return bindings;
}

/**
 * Converts rules[] to the legacy visibility_scope format with entityConditions.
 * Uses 'operator' (not 'logic') to match the backend VisibilityScopeDto (whitelist:true strips unknown fields).
 */
function convertRulesToLegacyScope(
  rules: RoleBindingRule[],
): { relations: string[]; operator: 'AND' | 'OR'; entityConditions?: any[] } | null {
  if (rules.length === 0) {
    return null;
  }

  const defaultRule = rules.find((r) => !r.entityFilter);
  const specificRules = rules.filter((r) => r.entityFilter);

  // Top-level scope from default rule
  const topLevelRelations = defaultRule?.read?.relations || [];
  const topLevelOperator = defaultRule?.read?.logic || 'OR';

  // Build entityConditions from specific rules — use 'operator' inside scope too
  const entityConditions = specificRules.map((rule) => ({
    field: rule.entityFilter!.field,
    operator: rule.entityFilter!.operator,
    values: rule.entityFilter!.values,
    scope: rule.read ? { relations: rule.read.relations, operator: rule.read.logic } : null,
  }));

  if (topLevelRelations.length === 0 && entityConditions.length === 0) {
    return null; // Unrestricted
  }

  return {
    relations: topLevelRelations,
    operator: topLevelOperator,
    entityConditions: entityConditions.length > 0 ? entityConditions : undefined,
  };
}

/** Pre-built lookup maps for fast UUID-based resolution. */
interface ElementLookupMaps {
  menuByUuid: Record<string, string>; // UUID -> interfaceName
  actionByUuid: Record<string, { iface: string; elementId: string }>; // UUID -> { iface, varchar }
  tabByUuid: Record<string, { iface: string; elementId: string }>; // UUID -> { iface, varchar }
}

function buildElementLookupMaps(interfaceElements: Record<string, any[]>): ElementLookupMaps {
  const menuByUuid: Record<string, string> = {};
  const actionByUuid: Record<string, { iface: string; elementId: string }> = {};
  const tabByUuid: Record<string, { iface: string; elementId: string }> = {}; // NEW
  for (const [interfaceName, elements] of Object.entries(interfaceElements)) {
    for (const el of elements) {
      if (el.elementType === 'menu') menuByUuid[el.id] = interfaceName;
      if (el.elementType === 'action')
        actionByUuid[el.id] = { iface: interfaceName, elementId: el.elementId };
      if (el.elementType === 'tab')
        tabByUuid[el.id] = { iface: interfaceName, elementId: el.elementId };
    }
  }
  return { menuByUuid, actionByUuid, tabByUuid };
}

function injectActionsIntoRules(
  rulesMap: Record<string, RoleBindingRules>,
  actionsByInterface: Record<string, Set<string>>,
  writeScopesByInterface: Record<string, Record<string, RuleReadScope | null>>,
): void {
  for (const [interfaceName, actionIds] of Object.entries(actionsByInterface)) {
    if (!rulesMap[interfaceName] || actionIds.size === 0) continue;
    let defaultRule = rulesMap[interfaceName].rules.find((r) => !r.entityFilter);
    if (!defaultRule) {
      defaultRule = { id: 'rule-default', entityFilter: null, read: null, actions: [] };
      rulesMap[interfaceName].rules.push(defaultRule);
    }
    defaultRule.actions = Array.from(actionIds);
    defaultRule.writeScopes = writeScopesByInterface[interfaceName] || {};
  }
}

/**
 * Converts legacy RoleBinding[] back to the new rules-based format.
 * Used when loading existing role bindings for editing.
 *
 * binding.elementId values from the server are UUIDs (interface_elements.id).
 * rule.actions stores varchar elementIds (for compatibility with ActionsChecklist).
 * rule.writeScopes reconstructs write scopes from action bindings' visibilityScope.
 * tabs reconstructs the list of selected tabs (if partial selection detected).
 */
export function convertLegacyBindingsToRules(
  bindings: RoleBinding[],
  interfaceElements: Record<string, any[]>, // interfaceName -> elements[]
): Record<string, RoleBindingRules> {
  const rulesMap: Record<string, RoleBindingRules> = {};
  const { menuByUuid, actionByUuid, tabByUuid } = buildElementLookupMaps(interfaceElements);

  const actionsByInterface: Record<string, Set<string>> = {};
  const writeScopesByInterface: Record<string, Record<string, RuleReadScope | null>> = {};
  const tabsByInterface: Record<string, Set<string>> = {}; // NEW: collect tabs per interface
  for (const interfaceName of Object.keys(interfaceElements)) {
    actionsByInterface[interfaceName] = new Set();
    writeScopesByInterface[interfaceName] = {};
    tabsByInterface[interfaceName] = new Set();
  }

  for (const binding of bindings) {
    const interfaceName = menuByUuid[binding.elementId];
    if (interfaceName) {
      rulesMap[interfaceName] = { rules: convertLegacyScopeToRules(binding.visibilityScope) };
    } else {
      const action = actionByUuid[binding.elementId];
      if (action && binding.enabled) {
        actionsByInterface[action.iface]?.add(action.elementId);
        // Reconstruct write scope from action binding's visibilityScope
        if (binding.visibilityScope) {
          const vs = binding.visibilityScope as any;
          const scope: RuleReadScope = {
            relations: vs.relations || resolveRelationsFromScope(vs),
            // Read both 'operator' (new saves) and 'logic' (old saves) for backward compat
            logic: ((vs.operator || vs.logic) as 'AND' | 'OR') || 'OR',
          };
          writeScopesByInterface[action.iface][action.elementId] = scope;
        }
      }
      // NEW: collect tabs
      const tab = tabByUuid[binding.elementId];
      if (tab && binding.enabled) {
        tabsByInterface[tab.iface]?.add(tab.elementId);
      }
    }
  }

  injectActionsIntoRules(rulesMap, actionsByInterface, writeScopesByInterface);

  // NEW: Reconstruct tabs property
  for (const [interfaceName, selectedTabIds] of Object.entries(tabsByInterface)) {
    if (!rulesMap[interfaceName]) continue;
    const allTabsInInterface =
      interfaceElements[interfaceName]
        ?.filter((el) => el.elementType === 'tab')
        .map((el) => el.elementId) ?? [];
    if (allTabsInInterface.length === 0) continue;
    // If all tabs are selected, leave tabs undefined (default behavior)
    // If only some tabs are selected, set tabs explicitly
    if (selectedTabIds.size < allTabsInInterface.length) {
      rulesMap[interfaceName].tabs = Array.from(selectedTabIds);
    }
    // If selectedTabIds.size === allTabsInInterface.length, tabs remains undefined (all included)
  }

  return rulesMap;
}

/**
 * Resolves the relations array from a backend VisibilityScope object.
 * Handles both explicit relations[] and the backend shorthand { scope: 'same_establishment' }.
 */
function resolveRelationsFromScope(scope: any): string[] {
  if (scope.relations && scope.relations.length > 0) return scope.relations;
  switch (scope.scope) {
    case 'same_establishment':
      return ['establishment'];
    case 'managed_by':
      return ['managedBy'];
    case 'same_establishment_or_managed_by':
      return ['establishment', 'managedBy'];
    case 'assignment':
      return ['assignment'];
    case 'same_program':
      return ['program'];
    case 'same_department':
      return ['department'];
    case 'relation_overlap':
      return scope.relations || [];
    default:
      return [];
  }
}

function entityConditionToRule(cond: any, index: number): RoleBindingRule {
  return {
    id: `rule-${index}`,
    entityFilter: {
      field: cond.field,
      operator: cond.operator || 'in',
      values: cond.values,
    },
    read: cond.scope
      ? {
          relations: resolveRelationsFromScope(cond.scope),
          // Read both 'operator' (new saves) and 'logic' (old saves) for backward compat
          logic: ((cond.scope.operator || cond.scope.logic) as 'AND' | 'OR') || 'OR',
        }
      : null,
    actions: [],
  };
}

function convertLegacyScopeToRules(scope: any): RoleBindingRule[] {
  if (!scope) {
    return [{ id: 'rule-default', entityFilter: null, read: null, actions: [] }];
  }

  // Treat empty object {} as unrestricted
  if (typeof scope === 'object' && Object.keys(scope).length === 0) {
    return [{ id: 'rule-default', entityFilter: null, read: null, actions: [] }];
  }

  // Explicit unrestricted
  if (scope.scope === 'unrestricted') {
    return [{ id: 'rule-default', entityFilter: null, read: null, actions: [] }];
  }

  const relations = resolveRelationsFromScope(scope);
  // Read both 'operator' (new saves after fix) and 'logic' (old saves before fix) for backward compat
  const logic = ((scope.operator || scope.logic) as 'AND' | 'OR') || 'OR';

  const defaultRule: RoleBindingRule = {
    id: 'rule-default',
    entityFilter: null,
    read: relations.length > 0 ? { relations, logic } : null,
    actions: [],
  };

  const specificRules: RoleBindingRule[] = scope.entityConditions
    ? scope.entityConditions.map(entityConditionToRule)
    : [];

  return [defaultRule, ...specificRules];
}
