/**
 * Typed interfaces for the resolved form of a visibility scope JSONB value.
 *
 * These are used internally by VisibilityScopeResolverService.
 * They are NOT directly serialized to/from the database — the raw JSONB form
 * is defined in visibility-scope.types.ts (VisibilityScope).
 */

/** One condition term produced after resolving a single relation against a user. */
export interface ResolvedCondition {
  /** SQL snippet to inject into the WHERE clause. Uses TypeORM parameter syntax. */
  sql: string;
  /** Parameter bindings for the SQL snippet. */
  params: Record<string, unknown>;
  /** Optional JOIN to add before this condition (left join, no duplicate check needed). */
  join?: { table: string; alias: string; on: string };
}

/**
 * When entityConditions are present, the resolver produces multiple
 * conditional branches — one per category of entity.
 * Each branch has its own SQL filter + an entity-field predicate.
 */
export interface ResolvedCategoryBranch {
  /** SQL condition that identifies this category (e.g. session_format = 'in_person'). */
  categorySql: string;
  /** Parameter bindings for the category SQL. */
  categoryParams: Record<string, unknown>;
  /** Resolved SQL condition for entities in this category. */
  scopeSql: string;
  /** Parameter bindings for the scope condition. */
  scopeParams: Record<string, unknown>;
  /** Optional JOINs required for this branch. */
  joins?: { table: string; alias: string; on: string }[];
}

/**
 * Top-level result produced by VisibilityScopeResolverService.resolve().
 *
 * The resolver does NOT apply this directly — it uses applyToQueryBuilder()
 * which calls resolve() internally and then injects into the TypeORM QB.
 */
export interface ResolvedVisibilityScope {
  /** Whether to skip filtering entirely. */
  unrestricted: boolean;

  /**
   * Flat conditions to AND / OR together (when there are no entityConditions).
   * Operator is 'OR' by default unless scope.operator === 'AND'.
   */
  conditions: ResolvedCondition[];

  /**
   * Logical operator to combine multiple conditions.
   * Defaults to 'OR'.
   */
  operator: 'AND' | 'OR';

  /**
   * Optional: when entityConditions are defined in the scope JSONB,
   * the resolver produces category-specific branches.
   * The QB receives a CASE-like OR block:
   *   (entity_field = 'cat_A' AND <branch_A_sql>)
   *   OR
   *   (entity_field = 'cat_B' AND <branch_B_sql>)
   *   OR
   *   (entity_field NOT IN ('cat_A','cat_B') AND <default_sql_or_zero>)
   */
  categoryBranches?: ResolvedCategoryBranch[];
}
