import { Injectable, Logger } from '@nestjs/common';
import type { ObjectLiteral } from 'typeorm';
import { DataSource, SelectQueryBuilder, Brackets } from 'typeorm';
import type { VisibilityScope, EntityCondition, RoleBindingRules } from './visibility-scope.types';
import { ENTITY_RELATION_REGISTRY, EntityType, EntitySideDescriptor } from './entity-relation-registry';
import { normalizeVisibilityScope } from './normalize-visibility-scope';
import type {
  ResolvedVisibilityScope,
  ResolvedCondition,
  ResolvedCategoryBranch,
} from './resolved-visibility-scope.interface';

export interface VisibilityScopeUserContext {
  userId: string;
  companyId: string;
}

/**
 * Maps each EntityType to its actual PostgreSQL table name and QueryBuilder alias.
 * Used by resolveEntityIds() to build queries without TypeORM entity class lookups.
 */
const ENTITY_TABLE_CONFIG: Partial<Record<EntityType, { tableName: string; alias: string }>> = {
  sessions: { tableName: 'sessions', alias: 'session' },
  reports: { tableName: 'session_reports', alias: 'report' },
  vscReports: { tableName: 'vsc_reports', alias: 'vsc_report' },
  vscDailyReports: { tableName: 'vsc_daily_reports', alias: 'r' },
  users: { tableName: 'users', alias: 'user' },
  tutors: { tableName: 'users', alias: 'user' },
  students: { tableName: 'users', alias: 'user' },
  volunteers: { tableName: 'users', alias: 'user' },
  admins: { tableName: 'users', alias: 'user' },
  roles: { tableName: 'roles', alias: 'role' },
  establishments: { tableName: 'establishments', alias: 'establishment' },
  // Academic modules
  programs: { tableName: 'programs', alias: 'program' },
  levels: { tableName: 'levels', alias: 'level' },
  subjects: { tableName: 'subjects', alias: 'subject' },
  holidays: { tableName: 'holidays', alias: 'holiday' },
  schoolYears: { tableName: 'school_years', alias: 'schoolYear' },
  activities: { tableName: 'activities', alias: 'activity' },
  activityTypes: { tableName: 'activity_types', alias: 'activityType' },
  specialties: { tableName: 'specialties', alias: 'specialty' },
  pairs: { tableName: 'session_student_tutor_pairs', alias: 'pair' },
};

/**
 * Central service that resolves a visibility_scope JSONB value into actual
 * SQL constraints applied on a TypeORM QueryBuilder.
 *
 * Architecture:
 *  1. resolve()             — converts VisibilityScope + user context into ResolvedVisibilityScope
 *  2. applyToQueryBuilder() — injects the resolved conditions into a TypeORM QB
 *
 * All scope types are handled through ENTITY_RELATION_REGISTRY.
 * No hardcoded per-scope logic remains here — each scope maps to registry relations.
 *
 * Scope → relation mapping:
 *  - unrestricted                   → no-op
 *  - same_establishment             → relations: ['establishment']
 *  - managed_by                     → relations: ['managedBy']
 *  - same_establishment_or_managed_by → relations: ['establishment', 'managedBy'], operator: OR
 *  - assignment                     → relations: ['assignment']
 *  - relation_overlap               → uses scope.relations[] directly (custom)
 *  - (custom via relations[])       → any combination of registry keys
 */
@Injectable()
export class VisibilityScopeResolverService {
  private readonly logger = new Logger(VisibilityScopeResolverService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Applies the visibility scope conditions to the provided QueryBuilder.
   * No-op when scope is null/undefined or 'unrestricted'.
   */
  async applyToQueryBuilder<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    scope: VisibilityScope | null | undefined,
    entityType: EntityType,
    user: VisibilityScopeUserContext,
  ): Promise<void> {
    if (!scope) return;

    // Treat empty object {} as null (unrestricted) — prevents blockAll() behavior
    if (typeof scope === 'object' && Object.keys(scope).length === 0) {
      return;
    }

    const normalized = normalizeVisibilityScope(scope);
    if (normalized != null) {
      if ('rules' in normalized && Array.isArray((normalized as RoleBindingRules).rules)) {
        scope = this.compileRulesToScope(normalized as RoleBindingRules);
      } else {
        scope = normalized as VisibilityScope;
      }
    } else if ('rules' in scope && Array.isArray((scope as unknown as RoleBindingRules).rules)) {
      scope = this.compileRulesToScope(scope as unknown as RoleBindingRules);
    }

    if (scope.scope === 'unrestricted') return;

    const resolved = await this.resolve(scope, entityType, user);

    if (resolved.unrestricted) return;

    // Category branches (entityConditions) take priority over flat conditions
    if (resolved.categoryBranches && resolved.categoryBranches.length > 0) {
      this.applyBranches(qb, resolved.categoryBranches, resolved.conditions, resolved.operator);
    } else {
      this.applyFlatConditions(qb, resolved.conditions, resolved.operator);
    }
  }

  /**
   * Resolves a VisibilityScope into its concrete SQL conditions.
   * Public for testing / introspection.
   */
  async resolve(
    scope: VisibilityScope,
    entityType: EntityType,
    user: VisibilityScopeUserContext,
  ): Promise<ResolvedVisibilityScope> {
    if (scope.scope === 'unrestricted') {
      return { unrestricted: true, conditions: [], operator: 'OR' };
    }

    const relations = this.deriveRelationsFromScope(scope);
    const operator: 'AND' | 'OR' = scope.operator ?? 'OR';

    // Resolve flat conditions from top-level relations
    const conditions = await this.resolveRelations(relations, entityType, user, scope);

    // If no conditions could be resolved and it's not unrestricted → block all
    if (conditions.length === 0 && !scope.entityConditions?.length) {
      return { unrestricted: false, conditions: [this.blockAll()], operator };
    }

    // Resolve entityConditions branches if present
    let categoryBranches: ResolvedCategoryBranch[] | undefined;
    if (scope.entityConditions?.length) {
      categoryBranches = await this.resolveCategoryBranches(
        scope.entityConditions,
        entityType,
        user,
        scope,
      );
    }

    return { unrestricted: false, conditions, operator, categoryBranches };
  }

  // ─── Private: resolution helpers ─────────────────────────────────────────

  /**
   * Derives the list of relation keys to use from the scope type.
   * Explicit scope.relations[] always win.
   */
  private deriveRelationsFromScope(scope: VisibilityScope): string[] {
    if (scope.relations && scope.relations.length > 0) return scope.relations;

    switch (scope.scope) {
      case 'same_establishment':
        return ['establishment'];
      case 'same_program':
        return ['program'];
      case 'same_department':
        return ['department'];
      case 'managed_by':
        return ['managedBy'];
      case 'same_establishment_or_managed_by':
        return ['establishment', 'managedBy'];
      case 'assignment':
        return ['assignment'];
      case 'relation_overlap':
        // relation_overlap requires explicit relations[]
        return [];
      default:
        return [];
    }
  }

  /**
   * For each relation key, resolves user-side values then builds an entitySide condition.
   */
  private async resolveRelations(
    relations: string[],
    entityType: EntityType,
    user: VisibilityScopeUserContext,
    scope: VisibilityScope,
  ): Promise<ResolvedCondition[]> {
    const conditions: ResolvedCondition[] = [];

    for (const relKey of relations) {
      const descriptor = ENTITY_RELATION_REGISTRY[relKey];
      if (!descriptor) {
        this.logger.warn(`Unknown relation key '${relKey}' in visibility scope`);
        continue;
      }

      const entitySide: EntitySideDescriptor | undefined = descriptor.entitySides[entityType];
      if (!entitySide) {
        this.logger.warn(`No entitySide for relation '${relKey}' on entity '${entityType}'`);
        continue;
      }

      const suffix = this.randomSuffix();

      // Special handling for managedBy — no DB query needed, use userId directly
      if (relKey === 'managedBy') {
        const paramName = `vsMbId${suffix}`;
        conditions.push({
          sql: entitySide.condition.replace(':vsUserId', `:${paramName}`),
          params: { [paramName]: user.userId },
          join: entitySide.join,
        });
        continue;
      }

      // Special handling for roleTarget — uses companyId + targetRoleCode
      if (relKey === 'roleTarget' && scope.targetRoleCode) {
        const companyParam = `vsCompanyId${suffix}`;
        const roleParam = `vsTargetRoleCode${suffix}`;
        conditions.push({
          sql: entitySide.condition
            .replace(':vsTargetRoleCode', `:${roleParam}`)
            .replace(':vsCompanyId', `:${companyParam}`),
          params: { [roleParam]: scope.targetRoleCode, [companyParam]: user.companyId },
          join: entitySide.join,
        });
        continue;
      }

      // General case: run userSideQuery to get the set of values
      const values = await this.runUserSideQuery(descriptor.userSideQuery, user);

      if (values.length === 0) {
        // No values → this branch produces zero results; add a block-all for AND scenarios
        conditions.push(this.blockAllWithSuffix(suffix));
        continue;
      }

      const paramName = `vsValues${suffix}`;
      conditions.push({
        sql: entitySide.condition.replace(':...vsValues', `:...${paramName}`),
        params: { [paramName]: values },
        join: entitySide.join,
      });
    }

    return conditions;
  }

  /**
   * Resolves entityConditions into category branches for the QueryBuilder.
   */
  private async resolveCategoryBranches(
    entityConditions: EntityCondition[],
    entityType: EntityType,
    user: VisibilityScopeUserContext,
    parentScope: VisibilityScope,
  ): Promise<ResolvedCategoryBranch[]> {
    const branches: ResolvedCategoryBranch[] = [];

    for (const cond of entityConditions) {
      const condScope: VisibilityScope = {
        scope: cond.scope,
        relations: cond.relations,
        operator: cond.operator ?? parentScope.operator,
        targetRoleCode: parentScope.targetRoleCode,
      };
      const condRelations = this.deriveRelationsFromScope(condScope);
      const condConditions = await this.resolveRelations(condRelations, entityType, user, condScope);

      const suffix = this.randomSuffix();
      const catParam = `vsCatValues${suffix}`;

      branches.push({
        categorySql: `${cond.field} IN (:...${catParam})`,
        categoryParams: { [catParam]: cond.values },
        scopeSql: condConditions.map((c) => c.sql).join(` ${condScope.operator ?? 'OR'} `),
        scopeParams: Object.assign({}, ...condConditions.map((c) => c.params)),
        joins: condConditions.filter((c) => c.join).map((c) => c.join!),
      });
    }

    return branches;
  }

  // ─── Private: QueryBuilder injection ─────────────────────────────────────

  private applyFlatConditions<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    conditions: ResolvedCondition[],
    operator: 'AND' | 'OR',
  ): void {
    if (conditions.length === 0) {
      qb.andWhere('1 = 0');
      return;
    }

    // Add all required JOINs first (deduplicated by alias)
    const addedAliases = new Set<string>();
    for (const cond of conditions) {
      if (cond.join && !addedAliases.has(cond.join.alias)) {
        qb.leftJoin(cond.join.table, cond.join.alias, cond.join.on);
        addedAliases.add(cond.join.alias);
      }
    }

    if (conditions.length === 1) {
      qb.andWhere(conditions[0].sql, conditions[0].params);
      return;
    }

    qb.andWhere(
      new Brackets((sub) => {
        for (let i = 0; i < conditions.length; i++) {
          if (i === 0) {
            sub.where(conditions[i].sql, conditions[i].params);
          } else if (operator === 'AND') {
            sub.andWhere(conditions[i].sql, conditions[i].params);
          } else {
            sub.orWhere(conditions[i].sql, conditions[i].params);
          }
        }
      }),
    );
  }

  /**
   * Applies category branches as:
   *   (entity_field IN ('cat_A') AND <branch_A>)
   *   OR (entity_field IN ('cat_B') AND <branch_B>)
   *   OR (entity_field NOT IN ('cat_A','cat_B') AND <default_flat_conditions>)
   */
  private applyBranches<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    branches: ResolvedCategoryBranch[],
    defaultConditions: ResolvedCondition[],
    operator: 'AND' | 'OR',
  ): void {
    // Add all JOINs from branches
    const addedAliases = new Set<string>();
    for (const branch of branches) {
      for (const join of branch.joins ?? []) {
        if (!addedAliases.has(join.alias)) {
          qb.leftJoin(join.table, join.alias, join.on);
          addedAliases.add(join.alias);
        }
      }
    }
    for (const cond of defaultConditions) {
      if (cond.join && !addedAliases.has(cond.join.alias)) {
        qb.leftJoin(cond.join.table, cond.join.alias, cond.join.on);
        addedAliases.add(cond.join.alias);
      }
    }

    // Collect all category values to build the NOT IN for default
    const allCategoryValues: string[] = branches.flatMap((b) => {
      const catParams = Object.values(b.categoryParams);
      return (catParams[0] as string[]) ?? [];
    });

    const defaultField = branches[0]?.categorySql.split(' ')[0] ?? 'id';
    const defaultSuffix = this.randomSuffix();
    const defaultCatParam = `vsDefaultCat${defaultSuffix}`;

    qb.andWhere(
      new Brackets((outer) => {
        // One OR clause per branch
        for (const branch of branches) {
          if (!branch.scopeSql) continue;
          outer.orWhere(
            new Brackets((inner) => {
              inner.where(branch.categorySql, branch.categoryParams);
              inner.andWhere(`(${branch.scopeSql})`, branch.scopeParams);
            }),
          );
        }

        // Default clause: entities not matching any category use the top-level conditions
        if (defaultConditions.length > 0 && allCategoryValues.length > 0) {
          outer.orWhere(
            new Brackets((defaultBlock) => {
              defaultBlock.where(
                `${defaultField} NOT IN (:...${defaultCatParam})`,
                { [defaultCatParam]: allCategoryValues },
              );
              if (defaultConditions.length === 1) {
                defaultBlock.andWhere(defaultConditions[0].sql, defaultConditions[0].params);
              } else {
                defaultBlock.andWhere(
                  new Brackets((defInner) => {
                    for (let i = 0; i < defaultConditions.length; i++) {
                      if (i === 0) defInner.where(defaultConditions[i].sql, defaultConditions[i].params);
                      else if (operator === 'AND') defInner.andWhere(defaultConditions[i].sql, defaultConditions[i].params);
                      else defInner.orWhere(defaultConditions[i].sql, defaultConditions[i].params);
                    }
                  }),
                );
              }
            }),
          );
        }
      }),
    );
  }

  // ─── Private: DB helpers ──────────────────────────────────────────────────

  /**
   * ENTITY_RELATION_REGISTRY userSideQuery strings use `:userId` / `:companyId` (TypeORM-style).
   * DataSource.query() sends raw SQL to node-pg, which only understands `$1`, `$2`, …
   */
  private buildUserSideQueryForPg(
    query: string,
    user: VisibilityScopeUserContext,
  ): { sql: string; params: unknown[] } {
    let sql = query;
    const params: unknown[] = [];
    const hasUserId = sql.includes(':userId');
    const hasCompanyId = sql.includes(':companyId');
    if (hasUserId) {
      sql = sql.replace(/:userId/g, '$1');
      params.push(user.userId);
    }
    if (hasCompanyId) {
      const idx = hasUserId ? 2 : 1;
      sql = sql.replace(/:companyId/g, `$${idx}`);
      params.push(user.companyId);
    }
    return { sql, params };
  }

  private async runUserSideQuery(
    query: string,
    user: VisibilityScopeUserContext,
  ): Promise<string[]> {
    const { sql, params } = this.buildUserSideQueryForPg(query, user);
    const rows = await this.dataSource.query<{ value: string }[]>(sql, params);
    return rows.map((r) => r.value).filter(Boolean);
  }

  private blockAll(): ResolvedCondition {
    return { sql: '1 = 0', params: {} };
  }

  private blockAllWithSuffix(_suffix: string): ResolvedCondition {
    return { sql: '1 = 0', params: {} };
  }

  private randomSuffix(): string {
    return Math.random().toString(36).slice(2, 8);
  }

  // ─── Public Helpers (called by dashboard.service) ────────────────────────

  /**
   * Filters a list of entity IDs by visibility scope.
   * Returns the subset of candidateIds that the user can access according to the given scope.
   *
   * Uses DataSource.createQueryBuilder().from() to avoid TypeORM entity class dependency,
   * preventing runtime errors when table names differ from entity class names.
   *
   * @param candidateIds The entity IDs to filter (e.g. session IDs from the already-filtered list)
   * @param idColumn Ignored — kept for API compatibility; alias derived from entityType
   * @param scope The write scope to apply
   * @param entityType The entity type (e.g. 'sessions', 'reports')
   * @param user The user context
   * @returns Set of IDs that pass the scope check
   */
  async resolveEntityIds(
    candidateIds: string[],
    idColumn: string,
    scope: VisibilityScope | null | undefined,
    entityType: EntityType,
    user: VisibilityScopeUserContext,
  ): Promise<Set<string>> {
    // Treat null, undefined, unrestricted, or empty object {} as unrestricted
    if (!scope || scope.scope === 'unrestricted' || candidateIds.length === 0) {
      return new Set(candidateIds);
    }
    
    // Treat empty object {} as unrestricted
    if (typeof scope === 'object' && Object.keys(scope).length === 0) {
      return new Set(candidateIds);
    }

    const tableConfig = ENTITY_TABLE_CONFIG[entityType];
    if (!tableConfig) {
      this.logger.warn(`resolveEntityIds: no table config for entityType '${entityType}', allowing all`);
      return new Set(candidateIds);
    }

    const { tableName, alias } = tableConfig;

    const qb = this.dataSource
      .createQueryBuilder()
      .select(`${alias}.id`, 'id')
      .from(tableName, alias)
      .where(`${alias}.id IN (:...candidateIds)`, { candidateIds });

    await this.applyToQueryBuilder(qb, scope, entityType, user);

    const rows = await qb.getRawMany<{ id: string }>();
    return new Set(rows.map((r) => r.id).filter(Boolean));
  }

  /**
   * Returns the establishment IDs accessible by the given user.
   * Used by dashboard.service to flatten establishment-based scopes.
   */
  async resolveEstablishmentIds(userId: string, companyId: string): Promise<string[]> {
    const query = `
      SELECT ue.establishment_id AS value
      FROM user_establishments ue
      WHERE ue.user_id = $1
    `;
    const rows = await this.dataSource.query<{ value: string }[]>(query, [userId]);
    return rows.map((r) => r.value).filter(Boolean);
  }

  /**
   * Returns the session IDs where the user is a participant (assignment-based scope).
   * Used by dashboard.service to flatten assignment-based scopes.
   */
  async resolveAssignedSessionIds(userId: string, companyId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT sp.session_id AS value
      FROM session_participants sp
      WHERE sp.user_id = $1
    `;
    const rows = await this.dataSource.query<{ value: string }[]>(query, [userId]);
    return rows.map((r) => r.value).filter(Boolean);
  }

  // ─── Rules-based schema compilation ──────────────────────────────────────

  /**
   * Compiles a UI-friendly RoleBindingRules schema into a legacy VisibilityScope.
   * This allows the new rules[] format to reuse the existing applyToQueryBuilder logic.
   *
   * Strategy:
   *  - The default rule (no entityFilter) becomes the top-level scope
   *  - Rules with entityFilter become entityConditions[]
   *  - Each rule's read scope translates to relations + operator
   */
  compileRulesToScope(rules: RoleBindingRules): VisibilityScope {
    
    // Find the default rule (no entityFilter)
    const defaultRule = rules.rules.find((r) => !r.entityFilter);
    const specificRules = rules.rules.filter((r) => r.entityFilter);

    // Build top-level scope from default rule
    const topLevelRelations = defaultRule?.read?.relations ?? [];
    const topLevelOperator = defaultRule?.read?.logic ?? 'OR';

    // If no default rule and no specific rules, unrestricted
    if (!defaultRule && specificRules.length === 0) {
      return { scope: 'unrestricted' };
    }

    // Build entityConditions from specific rules
    const entityConditions: EntityCondition[] = specificRules.map((rule) => ({
      field: rule.entityFilter!.field,
      values: rule.entityFilter!.values,
      // For the legacy schema, we use 'relation_overlap' as the scope value
      // because we're providing explicit relations
      scope: 'relation_overlap',
      relations: rule.read?.relations ?? [],
      operator: rule.read?.logic ?? 'OR',
    }));

    return {
      scope: topLevelRelations.length > 0 ? 'relation_overlap' : 'unrestricted',
      relations: topLevelRelations,
      operator: topLevelOperator,
      entityConditions: entityConditions.length > 0 ? entityConditions : undefined,
    };
  }

  // ─── GlobalSearch multi-scope resolution ─────────────────────────────────

  /**
   * Resolves visibility scopes for multiple sidebar menu elements in a single DB query.
   * Used by GlobalSearch to determine per-entity access and scope without requiring
   * a separate @LinkedElement decorator per entity type.
   *
   * @param elementIds  Sidebar menu element IDs to look up (e.g. ['menu-tutors', 'menu-admins'])
   * @param interfaceName  Interface name to filter on (typically 'sidebar')
   * @param roleCodes  Role codes of the current user (case-insensitive)
   * @param companyId  Current user's company
   *
   * @returns Map<elementId, VisibilityScope | null>
   *   - Key present  → user has access; value is the scope to apply (null = unrestricted)
   *   - Key absent   → user has no access to this entity
   */
  async resolveMultipleScopes(
    elementIds: string[],
    interfaceName: string,
    roleCodes: string[],
    companyId: string,
  ): Promise<Map<string, VisibilityScope | null>> {
    if (!elementIds.length || !roleCodes.length) return new Map();

    const roleCodesLc = roleCodes.map((c) => (c ?? '').toLowerCase());

    const rows = await this.dataSource.query<{ element_id: string; visibility_scope: VisibilityScope | null }[]>(
      `
      SELECT DISTINCT ON (ie.element_id)
        ie.element_id,
        rie.visibility_scope
      FROM interface_elements ie
      JOIN role_interface_elements rie ON rie.element_id = ie.id AND rie.company_id = $1
      JOIN roles r ON r.id = rie.role_id AND r.company_id = $1
      WHERE ie.element_id = ANY($2)
        AND ie.interface_name = $3
        AND ie.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND LOWER(r.code) = ANY($4)
      ORDER BY ie.element_id, COALESCE(r.hierarchy_level, 2147483647) ASC, r.code ASC
      `,
      [companyId, elementIds, interfaceName, roleCodesLc],
    );

    const result = new Map<string, VisibilityScope | null>();
    for (const row of rows) {
      result.set(row.element_id, row.visibility_scope ?? null);
    }
    return result;
  }
}
