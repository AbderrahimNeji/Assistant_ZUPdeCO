import { Injectable } from '@nestjs/common';

import { ResourceAdapter } from '../../integration/adapters/resource.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { apiPartialFacts, safeErrorMessage } from '../skill.utils';

@Injectable()
export class DocumentSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'document';
  readonly domains = [
    /\b(document|documents|resource|resources|fichier|fichiers|pdf)\b/i,
  ];
  readonly domainTags = ['document', 'resources'];
  readonly capabilities: SkillCapability[] = ['list', 'search'];

  constructor(
    private readonly resources: ResourceAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const focused = ctx.applicationContext?.document?.id;
      if (focused) {
        const doc = await this.resources.getById(focused);
        const label =
          ctx.applicationContext?.document?.label?.trim() ||
          (doc && typeof doc === 'object'
            ? String(
                (doc as Record<string, unknown>).title ??
                  (doc as Record<string, unknown>).name ??
                  'document',
              )
            : 'document');
        return {
          skillId: this.id,
          ok: true,
          operation: 'focused_document',
          data: doc,
          facts: [
            `Focused document/resource: ${label}.`,
            'Use only non-sensitive metadata from the payload (title, type, status) — never quote ids or storage paths.',
          ],
        };
      }

      const list = await this.resources.list(15);
      const rows = Array.isArray(list) ? list : [];
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_documents',
        data: rows,
        facts: [
          `Resources/documents visible: ${rows.length}.`,
          ...rows.slice(0, 12).map((row, i) => {
            const r = row as Record<string, unknown>;
            return `${i + 1}. ${String(r.title ?? r.name ?? 'resource')}`;
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
