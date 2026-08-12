import { Injectable } from '@nestjs/common';

import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';

/**
 * Schema has onboarding tables; Ednov backend has no onboarding REST module.
 * This skill exists so questions are answered with an explicit API gap — never invented progress.
 */
@Injectable()
export class OnboardingSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'onboarding';
  readonly domains = [
    /\b(onboarding|hubspot|parcours d['’]inscription|étapes d['’]inscription|etapes d['’]inscription|pending activation|en attente d['’]activation)\b/i,
  ];
  readonly domainTags = ['onboarding', 'inscription-lifecycle'];
  readonly capabilities: SkillCapability[] = ['status', 'list', 'count'];

  constructor(private readonly aggregations: SkillAggregationService) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    const aggregated = await this.aggregations.tryHandle(this.id, ctx);
    if (aggregated) return aggregated;

    return {
      skillId: this.id,
      ok: true,
      operation: 'api_missing',
      data: null,
      facts: [
        'Onboarding / inscription lifecycle: unavailable — Ednov REST does not expose these schema tables.',
        'Missing APIs (do not invent):',
        '- GET /onboarding/records — expected: paginated user_onboarding_records (user, template, status, company). Required to count pending onboarding.',
        '- GET /onboarding/records/:id/steps — expected: user_onboarding_step_progress rows. Required for “why is this student still pending”.',
        '- GET /onboarding/templates — expected: onboarding_step_templates. Required to explain required steps.',
        '- GET /users/:id/histories — expected: user_histories + Hubspot-style validations. Required for onboarding timeline.',
        'Related live data you CAN use: student status via GET /users/students (registered / accompanied / deactivated) and GET /users/:id/status-history.',
        'Session enrollment is a different domain (GET /sessions/:id/participants).',
      ],
    };
  }
}
