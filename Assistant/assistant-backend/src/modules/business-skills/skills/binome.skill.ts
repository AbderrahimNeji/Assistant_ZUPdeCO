import { Injectable } from '@nestjs/common';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { MatchingAdapter } from '../../integration/adapters/matching.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { displayName, extractPersonName, apiPartialFacts, safeErrorMessage } from '../skill.utils';

/**
 * Durable core pairs (schema `core_pairs`) via GET /companies/:id/binome-coeur.
 * The richer `binomes` table has no REST controller in Ednov.
 */
@Injectable()
export class BinomeSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'binome';
  readonly domains = [
    /\b(binôme cœur|binome coeur|binômes? cœur|core pair|core pairs|binômes? durables?)\b/i,
  ];
  readonly domainTags = ['binome', 'core-pairs', 'binome-coeur'];
  readonly capabilities: SkillCapability[] = ['list', 'count', 'search', 'status'];

  constructor(
    private readonly matching: MatchingAdapter,
    private readonly academic: AcademicAdapter,
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
          facts: ['Binômes cœur require staff authorization (company-scoped).'],
        };
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const establishmentId =
        this.academic.resolveFocusedEstablishmentId() ||
        ctx.applicationContext?.establishment?.id ||
        undefined;
      const rows = await this.matching.listBinomeCoeur({
        establishmentId,
      });

      if (rows == null) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'binome_coeur_unavailable',
          data: null,
          facts: [
            'GET /companies/:companyId/binome-coeur did not return data for this user.',
            'The schema table `binomes` has no Ednov REST endpoint — do not invent durable binôme records from it.',
            'Session-level matching remains GET /sessions/student-tutor-pairs.',
          ],
        };
      }

      const name = extractPersonName(ctx.question);
      const filtered = name
        ? rows.filter((row) => {
            const blob = JSON.stringify({
              s: personLabel(row, 'studentUser', 'student'),
              t: personLabel(row, 'tutorUser', 'tutor'),
            }).toLowerCase();
            return blob.includes(name.toLowerCase());
          })
        : rows;

      return {
        skillId: this.id,
        ok: true,
        operation: 'list_binome_coeur',
        data: { count: filtered.length, sampleSize: rows.length },
        facts: [
          `Binômes cœur (core_pairs via GET /companies/:id/binome-coeur): ${filtered.length} in this result${
            name ? ` matching “${name}”` : ''
          } (API returned ${rows.length}).`,
          'These are durable establishment/subject pairs, not per-session student-tutor-pairs.',
          'Schema table `binomes` is not exposed by any REST controller — unavailable.',
          '',
          '| Student | Tutor | Establishment | Subject | Source |',
          '| --- | --- | --- | --- | --- |',
          ...filtered.slice(0, 15).map((row) => {
            const student = personLabel(row, 'studentUser', 'student');
            const tutor = personLabel(row, 'tutorUser', 'tutor');
            const est =
              nestedName(row.establishment) ||
              nestedName(row.establishmentName) ||
              '—';
            const subject =
              nestedName(row.subject) || nestedName(row.subjectName) || '—';
            const source = String(row.source ?? '—');
            return `| ${student} | ${tutor} | ${est} | ${subject} | ${source} |`;
          }),
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
}

function personLabel(
  row: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const raw = row[key];
    if (raw && typeof raw === 'object') {
      return displayName(raw as { firstName?: string; lastName?: string; displayName?: string });
    }
  }
  return '—';
}

function nestedName(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const o = value as { name?: string; label?: string };
    return o.name || o.label || null;
  }
  return null;
}
