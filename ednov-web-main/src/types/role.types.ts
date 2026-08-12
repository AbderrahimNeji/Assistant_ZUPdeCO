export type RoleMode = 'in_person' | 'remote' | 'hybrid';
export type RoleStatus = 'active' | 'inactive';

export interface RoleGroup {
  id: string;
  companyId: string;
  code: string;
  label: string;
  icon: string | null;
  color: string | null;
  mode: RoleMode | null;
  sortOrder: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  companyId: string;
  code: string;
  label: string;
  description?: string | null;
  roleGroup: string;
  roleGroupLabel: string;
  roleGroupIcon: string | null;
  roleGroupColor: string | null;
  hierarchyLevel?: number | null;
  icon?: string | null;
  color?: string | null;
  mode?: RoleMode | null;
  isSystem: boolean;
  isDefault: boolean;
  status: RoleStatus;
  permissions?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRolePayload {
  code: string;
  label: string;
  description?: string;
  roleGroup?: string;
  hierarchyLevel?: number;
  icon?: string;
  color?: string;
  mode?: RoleMode;
  isSystem?: boolean;
  isDefault?: boolean;
  status?: RoleStatus;
  cloneInterfaceBindingsFromRoleId?: string;
}

export interface UpdateRolePayload extends Partial<Omit<CreateRolePayload, 'code'>> {}

export interface CreateRoleGroupPayload {
  code: string;
  label: string;
  icon?: string;
  color?: string;
  mode?: RoleMode;
  sortOrder?: number;
}

export interface UpdateRoleGroupPayload extends Partial<CreateRoleGroupPayload> {}

export interface RoleBinding {
  elementId: string;
  enabled: boolean;
  visibilityScope?: {
    relations: string[];
    /** Backend VisibilityScopeDto uses 'operator'. Legacy data in DB may use 'logic'. */
    operator?: 'AND' | 'OR';
    logic?: 'AND' | 'OR';
    entityConditions?: Array<{
      field: string;
      operator: 'equals' | 'in';
      values: string[];
      scope?: { relations: string[]; operator?: 'AND' | 'OR'; logic?: 'AND' | 'OR' };
    }>;
  } | null;
  inherited?: boolean;
  inheritedFrom?: string;
}

// ─── NEW UI-FRIENDLY RULES SCHEMA (aligned with backend) ────────────────────

/**
 * Filter defining which entity types/subcategories a rule applies to.
 * If null/undefined, the rule applies to all entities (default rule).
 */
export interface RuleEntityFilter {
  /** Entity field to filter on (e.g. 'type', 'sessionFormat'). */
  field: string;
  /** Operator for matching values. */
  operator: 'in' | 'equals' | 'not_in';
  /** Value(s) to match against. */
  values: string[];
}

/**
 * Read scope configuration for a rule.
 * Defines which relations to check and how to combine them (AND/OR).
 */
export interface RuleReadScope {
  /** Relation keys (e.g. ['establishment', 'program']). */
  relations: string[];
  /** Logical operator combining relations. Default: 'OR'. */
  logic: 'AND' | 'OR';
}

/**
 * A single permission rule within a module binding.
 * Combines entity filtering, read scope, and allowed action IDs.
 */
export interface RoleBindingRule {
  /** Unique ID for this rule (e.g. 'rule-default', 'rule-homework'). */
  id: string;
  /** Optional filter: if present, rule applies only to entities matching this filter. */
  entityFilter?: RuleEntityFilter | null;
  /** Read scope: if present, defines visibility restrictions for READ operations. */
  read?: RuleReadScope | null;
  /** Write scopes per action: defines visibility restrictions for WRITE operations (edit, cancel, delete, etc.). */
  writeScopes?: Record<string, RuleReadScope | null>;
  /** List of action element IDs the user can perform (e.g. ['action-create', 'action-edit-row']). */
  actions: string[];
}

/**
 * Complete rules-based binding schema for a module (menu-level binding).
 * Replaces the legacy visibilityScope structure in the UI.
 */
export interface RoleBindingRules {
  rules: RoleBindingRule[];
  /**
   * Optional: explicit list of tab elementIds to include for this module.
   * - If undefined/null: all tabs are auto-included (default behavior, retrocompatible).
   * - If array: only the listed tabs are included.
   */
  tabs?: string[] | null;
}
