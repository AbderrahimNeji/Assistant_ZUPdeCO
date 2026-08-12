export type VisibilityScopeValue =
  | 'unrestricted'
  | 'same_establishment'
  | 'same_program'
  | 'same_department'
  | 'managed_by'
  | 'same_establishment_or_managed_by'
  | 'assignment'
  | 'relation_overlap';

// ─── NEW UI-FRIENDLY SCHEMA (rules-based) ───────────────────────────────────

/**
 * Filter defining which entity types/subcategories a rule applies to.
 * If null, the rule applies to all entities not matched by other rules (default rule).
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
  /** Relation keys from ENTITY_RELATION_REGISTRY (e.g. ['establishment', 'program']). */
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
 * Complete rules-based binding schema for a module menu element.
 * Replaces the legacy VisibilityScope structure for UI-driven role configuration.
 */
export interface RoleBindingRules {
  rules: RoleBindingRule[];
}

/**
 * One entry in the entityConditions array.
 * Defines a different scope rule for entities matching a specific field value.
 *
 * Example: sessions with session_format = 'remote' might have a different
 * scope than sessions with session_format = 'in_person'.
 */
export interface EntityCondition {
  /** Entity field name to filter on (e.g. 'session_format', 'type'). */
  field: string;
  /** Value(s) this condition applies to. */
  values: string[];
  /** Scope rule to apply for entities matching this condition. */
  scope: VisibilityScopeValue;
  /** Relations to use for this scoped condition (overrides top-level relations). */
  relations?: string[];
  /** Logical operator for combining multiple relation conditions. */
  operator?: 'AND' | 'OR';
}

export interface VisibilityScope {
  scope: VisibilityScopeValue;
  /** Relation keys from ENTITY_RELATION_REGISTRY to use when scope needs them. */
  relations?: string[];
  /** For user-targeting scopes: the role code of users to look at. */
  targetRoleCode?: string;
  /** Logical operator when combining multiple relations. Default: 'OR'. */
  operator?: 'AND' | 'OR';
  /**
   * Optional: per-subcategory scope overrides.
   * When present, the resolver applies a different scope rule
   * for each matching entity subcategory (e.g. session type or format).
   * Entities NOT matching any condition use the top-level scope.
   */
  entityConditions?: EntityCondition[];
}

export const LINKED_ELEMENT_KEY = 'linked_element';
export const VISIBILITY_SCOPE_KEY = 'visibility_scope';

declare module 'express' {
  interface Request {
    visibilityScope?: VisibilityScope | null;
  }
}
