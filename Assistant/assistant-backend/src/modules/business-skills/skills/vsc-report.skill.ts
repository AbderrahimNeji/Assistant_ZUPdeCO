import { Injectable } from '@nestjs/common';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { UserAdapter } from '../../integration/adapters/user.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { apiPartialFacts, safeErrorMessage } from '../skill.utils';

const VSC_STATUSES = ['draft', 'submitted', 'validated'] as const;

@Injectable()
export class VscReportSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'vsc-report';
  readonly domains = [
    /\b(vsc|volontaire en service civique|daily report|rapport journalier|rapports? vsc)\b/i,
  ];
  readonly domainTags = ['vsc', 'vsc-reports', 'vsc-daily-reports'];
  readonly capabilities: SkillCapability[] = [
    'list',
    'status',
    'count',
    'search',
    'stats',
  ];

  constructor(
    private readonly academic: AcademicAdapter,
    private readonly users: UserAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const q = ctx.question;
      const sessionId = this.academic.resolveFocusedSessionId();
      const establishmentId = this.academic.resolveFocusedEstablishmentId();
      const volunteerId = this.users.resolveFocusedTutorId();

      if (/\b(daily|journalier|quotidi)/i.test(q)) {
        const page = await this.academic.listVscDailyReports(20, {
          ...(establishmentId ? { establishmentId } : {}),
        });
        return {
          skillId: this.id,
          ok: true,
          operation: 'list_vsc_daily',
          data: { total: page.total, sample: page.items.length },
          facts: [
            `VSC daily reports (GET /sessions/vsc-daily-reports): sample ${page.items.length}${
              page.total != null ? `, total=${page.total}` : ''
            }.`,
            'Statuses: to_fill | submitted | validated.',
            ...page.items.slice(0, 12).map((row, i) => {
              const status = String(row.status ?? 'n/a');
              const date = String(row.reportDate ?? row.report_date ?? 'n/a');
              const est =
                (row.establishment as { name?: string } | undefined)?.name ??
                'establishment n/a';
              return `${i + 1}. ${date} — ${est} — status=${status}`;
            }),
          ],
        };
      }

      const statuses = inferStatuses(q);
      const page = await this.academic.listVscReports(20, {
        ...(statuses.length ? { statuses: [...statuses] } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(establishmentId ? { establishmentId } : {}),
        ...(volunteerId ? { userId: volunteerId } : {}),
      });

      const byStatus = countStatus(page.items);
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_vsc_reports',
        data: { total: page.total, byStatus, sample: page.items.length },
        facts: [
          `VSC reports (GET /sessions/vsc-reports): sample ${page.items.length}${
            page.total != null ? `, total=${page.total}` : ''
          }.`,
          `Status counts in sample: ${
            Object.entries(byStatus)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ') || 'none'
          }.`,
          'Allowed statuses: draft, submitted, validated (no rejected).',
          sessionId ? 'Filtered to the focused session.' : '',
          ...page.items.slice(0, 10).map((row, i) => {
            const status = String(row.status ?? 'n/a');
            const category = String(row.category ?? 'n/a');
            return `${i + 1}. category=${category} status=${status}`;
          }),
          'Structured session_comptes_rendus (scoring CR) has no dedicated list API — do not invent those rows.',
        ].filter(Boolean),
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
}

function inferStatuses(q: string): string[] {
  if (/\b(validated|validé|valide)\b/i.test(q)) return ['validated'];
  if (/\b(submitted|soumis|pending validation)\b/i.test(q)) return ['submitted'];
  if (/\b(draft|brouillon)\b/i.test(q)) return ['draft'];
  return [];
}

function countStatus(rows: Array<Record<string, unknown>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = String(row.status ?? 'unknown');
    out[key] = (out[key] ?? 0) + 1;
  }
  for (const s of VSC_STATUSES) {
    if (out[s] == null) out[s] = 0;
  }
  return out;
}
