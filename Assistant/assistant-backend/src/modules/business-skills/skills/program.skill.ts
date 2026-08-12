import { Injectable } from '@nestjs/common';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { DashboardAdapter } from '../../integration/adapters/dashboard.adapter';
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
export class ProgramSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'program';
  readonly domains = [
    /\b(program|programs|programme|programmes|parcours|curriculum)\b/i,
  ];
  readonly domainTags = ['program', 'curriculum'];
  readonly capabilities: SkillCapability[] = ['count', 'list', 'search'];

  constructor(
    private readonly academic: AcademicAdapter,
    private readonly dashboard: DashboardAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      if (/\b(how many|combien|count|nombre)\b/i.test(ctx.question)) {
        try {
          const stats = await this.dashboard.getStats();
          if (typeof stats.programsCount === 'number') {
            return {
              skillId: this.id,
              ok: true,
              operation: 'count_programs',
              data: { count: stats.programsCount },
              facts: [`Programs count (dashboard): ${stats.programsCount}.`],
            };
          }
        } catch {
          // fall through
        }
      }

      const focused =
        ctx.applicationContext?.program?.id ||
        ctx.applicationContext?.course?.id;
      if (focused) {
        const course =
          await this.academic.findProgramOrSessionAsCourse(focused);
        return {
          skillId: this.id,
          ok: true,
          operation: 'focused_program',
          data: course,
          facts: [
            `Focused program/course: ${course.title}.`,
            course.subject ? `Code/subject: ${course.subject}.` : '',
            course.description ? `Description: ${course.description}` : '',
          ].filter(Boolean),
        };
      }

      const nameMatch = ctx.question.match(
        /\b(?:program|programme|parcours)\s+["“]?([^"”?.!]+)["”]?/i,
      );
      if (nameMatch?.[1]) {
        const hits = await this.academic.findProgramsByName(
          nameMatch[1].trim(),
        );
        return {
          skillId: this.id,
          ok: true,
          operation: 'search_programs',
          data: hits,
          facts: hits.length
            ? [
                `Programs matching "${nameMatch[1].trim()}":`,
                ...hits.map((p, i) => `${i + 1}. ${p.title}`),
              ]
            : [`No programs matching "${nameMatch[1].trim()}".`],
        };
      }

      const programs = await this.academic.listProgramsAsCourses(15);
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_programs',
        data: programs,
        facts: [
          `Programs (sample of ${programs.length}):`,
          ...programs.map((p, i) => `${i + 1}. ${p.title}`),
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
