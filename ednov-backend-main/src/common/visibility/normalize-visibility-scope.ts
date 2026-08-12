import type { RoleBindingRules, VisibilityScope } from './visibility-scope.types';

/**
 * Normalise les scopes legacy (ex. tabs : relations: ['same_establishment'])
 * vers le format attendu par VisibilityScopeResolver (scope + relations: ['establishment']).
 */
export function normalizeVisibilityScope(
  scope: VisibilityScope | RoleBindingRules | null | undefined,
): VisibilityScope | RoleBindingRules | null | undefined {
  if (scope == null || typeof scope !== 'object') {
    return scope;
  }

  if ('rules' in scope && Array.isArray((scope as RoleBindingRules).rules)) {
    return scope;
  }

  const s = scope as VisibilityScope & { logic?: 'AND' | 'OR' };
  const relations = [...(s.relations ?? [])];

  if (relations.includes('same_establishment')) {
    return {
      scope: 'same_establishment',
      relations: ['establishment'],
      operator: s.operator ?? s.logic ?? 'AND',
      entityConditions: s.entityConditions,
      targetRoleCode: s.targetRoleCode,
    };
  }

  if (s.scope === 'same_establishment' && relations.length === 0) {
    return {
      ...s,
      relations: ['establishment'],
    };
  }

  return s;
}
