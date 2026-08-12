import { Injectable } from '@nestjs/common';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { DashboardAdapter } from '../../integration/adapters/dashboard.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import {
  establishmentActivityFacts,
  isDeicticEstablishmentQuestion,
  apiPartialFacts,
  safeErrorMessage,
} from '../skill.utils';

@Injectable()
export class EstablishmentSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'establishment';
  readonly domains = [
    /\b(establishment|establishments|école|ecole|écoles|ecoles|school|schools|établissement|etablissement|établissements|etablissements)\b/i,
    /\b(plus actifs?|moins actifs?|most active|least active|le plus actif|les plus actifs|top (?:schools?|établissements?|écoles?)|classe(?:r)? les)\b/i,
  ];
  readonly domainTags = ['establishment', 'school'];
  readonly capabilities: SkillCapability[] = [
    'count',
    'list',
    'search',
    'stats',
  ];

  constructor(
    private readonly academic: AcademicAdapter,
    private readonly dashboard: DashboardAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      if (!isStaffRole(ctx.user.role)) {
        return {
          skillId: this.id,
          ok: false,
          operation: 'unauthorized',
          data: null,
          facts: ['Establishment data requires staff authorization.'],
        };
      }

      const q = ctx.question;
      const focusedId = this.academic.resolveFocusedEstablishmentId();

      if (asksEstablishmentRank(q)) {
        return this.establishmentRanking(q);
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      if (/\b(how many|combien|count|nombre)\b/i.test(q)) {
        try {
          const stats = await this.dashboard.getStats();
          const count =
            typeof stats.establishmentsCount === 'number'
              ? stats.establishmentsCount
              : (await this.academic.listEstablishments(100)).length;
          return {
            skillId: this.id,
            ok: true,
            operation: 'count_establishments',
            data: { count },
            facts: [
              `Establishments count (live, authorization-scoped): ${count}.`,
              '',
              '| Metric | Value |',
              '| --- | ---: |',
              `| Establishments | ${count} |`,
            ],
          };
        } catch (error) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'count_partial',
            data: null,
            facts: apiPartialFacts('GET /establishments', error),
            warnings: [safeErrorMessage(error)],
          };
        }
      }

      if (asksCoordinator(q)) {
        return this.coordinatorForEstablishment(focusedId, q);
      }

      if (focusedId) {
        try {
          const row = await this.academic.getEstablishment(focusedId);
          const label =
            row.name ||
            row.label ||
            ctx.applicationContext?.establishment?.label ||
            'Focused establishment';
          return {
            skillId: this.id,
            ok: true,
            operation: 'focused_establishment',
            data: row,
            facts: [
              `Focused establishment: ${label}.`,
              row.city ? `City: ${row.city}.` : '',
            ].filter(Boolean),
          };
        } catch {
          // fall through to list
        }
      }

      const searchMatch = q.match(
        /\b(?:named|appelé|appele|cherche|search|find)\s+["«]?([^"»]+)["»]?/i,
      );
      const search = searchMatch?.[1]?.trim();
      const list = await this.academic.listEstablishments(15, search);
      const tableRows = list.map(
        (row, i) =>
          `| ${i + 1} | ${row.name || row.label || 'Establishment'} | ${row.city ?? '—'} |`,
      );

      return {
        skillId: this.id,
        ok: true,
        operation: search ? 'search_establishments' : 'list_establishments',
        data: list,
        facts: [
          search
            ? `Establishments matching “${search}” (${list.length}):`
            : `Establishments (sample of ${list.length}, authorization-scoped):`,
          '',
          '| # | Name | City |',
          '| ---: | --- | --- |',
          ...tableRows,
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts(this.id, error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async coordinatorForEstablishment(
    focusedId: string | undefined,
    q: string,
  ): Promise<SkillResult> {
    let id = focusedId;
    if (!id) {
      const named = q.match(
        /\b(?:establishment|établissement|etablissement|école|ecole|school)\s+["«]?([^"»?!.]+)["»]?/i,
      );
      if (named?.[1]?.trim()) {
        const hits = await this.academic.searchEstablishments(named[1].trim());
        id = hits[0]?.id;
      }
    }
    if (!id) {
      const list = await this.academic.listEstablishments(5);
      id = list[0]?.id;
    }
    if (!id) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'coordinator_needs_establishment',
        data: null,
        facts: [
          'DIRECT ANSWER: No establishment in scope to resolve a coordinator (API returned zero rows).',
          'NEXT ACTION: open an establishment, then ask again.',
          'SOURCE: GET /companies/current/establishments',
        ],
      };
    }
    const row = await this.academic.getEstablishment(id);
    const label = row.name || row.label || 'Establishment';
    const fromList =
      row.coordinators?.map((c) =>
        `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() ||
        c.displayName ||
        '',
      ).filter(Boolean) ?? [];
    const fromJoin =
      row.establishmentCoordinators
        ?.map((l) => {
          const c = l.coordinator;
          if (!c) return '';
          return (
            `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() ||
            c.displayName ||
            ''
          );
        })
        .filter(Boolean) ?? [];
    const managed = row.managedBy
      ? `${row.managedBy.firstName ?? ''} ${row.managedBy.lastName ?? ''}`.trim() ||
        row.managedBy.displayName ||
        ''
      : '';
    const names = [...new Set([...fromList, ...fromJoin, managed].filter(Boolean))];
    return {
      skillId: this.id,
      ok: true,
      operation: 'establishment_coordinator',
      data: row,
      facts: [
        names.length
          ? `DIRECT ANSWER: Coordinator(s) for ${label}: ${names.join(', ')}.`
          : `DIRECT ANSWER: No coordinator/manager name on the live establishment payload for ${label}.`,
        'EXPLANATION: GET /companies/current/establishments/:id (coordinators / establishmentCoordinators / managedBy).',
        'NEXT ACTION: open the establishment fiche to assign coordinators.',
        'SOURCE: GET /companies/current/establishments/:id',
      ],
    };
  }

  private async establishmentRanking(q: string): Promise<SkillResult> {
    const preferLeast = /\b(least|moins|pire|worst|lowest)\b/i.test(q);
    const focusedId = this.academic.resolveFocusedEstablishmentId();
    const params =
      isDeicticEstablishmentQuestion(q) && focusedId
        ? { establishmentId: focusedId }
        : undefined;
    const charts = await this.dashboard.getCharts(params).catch(() => null);
    const rank = this.dashboard.rankEstablishmentActivity(charts);
    return {
      skillId: this.id,
      ok: true,
      operation: preferLeast
        ? 'establishment_rank_least_active'
        : 'establishment_rank_most_active',
      data: rank,
      facts: establishmentActivityFacts({ rank, preferLeast }),
    };
  }
}

function asksEstablishmentRank(q: string): boolean {
  const entity =
    /\b(establishment|établissements?|etablissements?|écoles?|ecoles?|schools?)\b/i.test(
      q,
    );
  const rank =
    /\b(rank|classement|classer|classe(?:r)?|top|most|plus|least|moins|best|worst|meilleur|pire|actifs?|active)\b/i.test(
      q,
    );
  return (
    (entity && rank) ||
    /\b(top (?:schools?|établissements?|etablissements?|écoles?|ecoles?))\b/i.test(
      q,
    ) ||
    /\b(classe(?:r)? les)\b/i.test(q)
  );
}

function asksCoordinator(q: string): boolean {
  return /\b(coordinator|coordinateur|coordonnateur|who manages|qui (gère|gere)|managed by)\b/i.test(
    q,
  );
}
