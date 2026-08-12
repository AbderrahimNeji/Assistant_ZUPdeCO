import { Injectable } from '@nestjs/common';

import { RegistrationAdapter } from '../../integration/adapters/registration.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { apiPartialFacts, displayName, safeErrorMessage } from '../skill.utils';

@Injectable()
export class RegistrationSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'registration';
  readonly domains = [
    /\b(registrat|enrollment|enrolment|inscrit|inscription|enroll|participant|participants)\b/i,
  ];
  readonly domainTags = ['registration', 'enrollment', 'participants'];
  readonly capabilities: SkillCapability[] = ['list', 'status', 'count'];

  constructor(
    private readonly registrations: RegistrationAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      if (
        /\b(onboarding|hubspot|parcours d['’]inscription|activation pending)\b/i.test(
          ctx.question,
        )
      ) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'onboarding_api_missing',
          data: null,
          facts: [
            'User onboarding lifecycle is not available via Ednov REST.',
            'Missing endpoints for schema tables user_onboarding_records, user_onboarding_step_progress, onboarding_step_templates, user_histories.',
            'This skill only lists session participants (GET /sessions/:id/participants).',
            'Do not invent onboarding step completion or Hubspot history.',
          ],
        };
      }

      const rows = await this.registrations.listForUser(
        ctx.user.userId,
        ctx.user.role,
      );
      const list = Array.isArray(rows) ? rows : [];
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_session_participants',
        data: list,
        facts: [
          `Session participations visible (authorization-scoped sample): ${list.length}.`,
          'This is session enrollment, not the onboarding module.',
          ...list.slice(0, 15).map((row, i) => {
            const label = row.course?.title ?? 'session';
            const person = row.student
              ? displayName(row.student)
              : 'participant';
            const role = row.role ?? 'n/a';
            const att = row.attendanceStatus ?? 'n/a';
            return `${i + 1}. ${person} — ${label} — role=${role} attendance=${att}`;
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
