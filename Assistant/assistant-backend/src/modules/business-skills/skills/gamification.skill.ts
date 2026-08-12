import { Injectable } from '@nestjs/common';

import { GamificationAdapter } from '../../integration/adapters/gamification.adapter';
import { UserAdapter } from '../../integration/adapters/user.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { apiPartialFacts, displayName, safeErrorMessage } from '../skill.utils';

@Injectable()
export class GamificationSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'gamification';
  readonly domains = [
    /\b(gamification|xp|badge|badges|leaderboard|classement|niveau|niveaux|points?\b|challenge|challenges)\b/i,
  ];
  readonly domainTags = ['gamification', 'xp', 'badges', 'leaderboard'];
  readonly capabilities: SkillCapability[] = [
    'status',
    'list',
    'stats',
    'count',
  ];

  constructor(
    private readonly gamification: GamificationAdapter,
    private readonly users: UserAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const q = ctx.question;
      const tutorId = this.users.resolveFocusedTutorId();

      if (/\b(leaderboard|classement|top|ranking)\b/i.test(q)) {
        const board = await this.gamification.getLeaderboard(20);
        const entries = board.entries ?? [];
        return {
          skillId: this.id,
          ok: true,
          operation: 'leaderboard',
          data: {
            myRank: board.myRank ?? null,
            count: entries.length,
          },
          facts: [
            `Gamification leaderboard (GET /gamification/leaderboard): ${entries.length} entries.`,
            board.myRank != null ? `Current user rank: ${board.myRank}.` : '',
            '',
            '| Rank | Name | XP | Level |',
            '| --- | --- | --- | --- |',
            ...entries.slice(0, 15).map((e) => {
              const level =
                e.levelBadge?.displayLabel ??
                e.currentNiveau?.label ??
                e.currentNiveau?.name ??
                '—';
              return `| ${e.rank ?? '—'} | ${e.displayName ?? '—'} | ${e.totalXp ?? '—'} | ${level} |`;
            }),
          ].filter(Boolean),
        };
      }

      if (tutorId && isStaffRole(ctx.user.role)) {
        try {
          const summary = await this.gamification.getForUser(tutorId);
          const tutor = await this.users.findTutorById(tutorId).catch(() => null);
          return {
            skillId: this.id,
            ok: true,
            operation: 'tutor_gamification',
            data: redactSummary(summary),
            facts: formatSummaryFacts(
              tutor ? displayName(tutor) : 'Focused tutor',
              summary,
              'GET /gamification/users/:userId (staff, same company, tutor/volunteer only)',
            ),
          };
        } catch (error) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'tutor_gamification_partial',
            data: null,
            facts: apiPartialFacts('GET /gamification/users/:userId', error),
            warnings: [safeErrorMessage(error)],
          };
        }
      }

      if (/\b(history|historique|xp log)\b/i.test(q)) {
        const history = await this.gamification.getMyHistory(15);
        return {
          skillId: this.id,
          ok: true,
          operation: 'xp_history',
          data: { count: history.length },
          facts: [
            `XP history (GET /gamification/me/history): ${history.length} entries.`,
            ...history.slice(0, 10).map((row, i) => {
              const amt = row.amount ?? row.xp ?? '—';
              const reason = row.reason ?? row.label ?? 'xp';
              return `${i + 1}. ${reason} — ${amt}`;
            }),
          ],
        };
      }

      const me = await this.gamification.getMe();
      return {
        skillId: this.id,
        ok: true,
        operation: 'my_gamification',
        data: redactSummary(me),
        facts: formatSummaryFacts(
          'Current user',
          me,
          'GET /gamification/me (tutor/volunteer profile)',
        ),
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

function redactSummary(summary: {
  totalXp?: number;
  currentNiveau?: { numero?: number; label?: string; name?: string } | null;
  nextNiveau?: { numero?: number; label?: string; name?: string } | null;
  levelBadge?: { displayLabel?: string; tier?: string } | null;
  badges?: Array<{ name?: string; label?: string; displayLabel?: string }>;
}) {
  return {
    totalXp: summary.totalXp ?? null,
    level:
      summary.levelBadge?.displayLabel ??
      summary.currentNiveau?.label ??
      summary.currentNiveau?.name ??
      null,
    nextLevel:
      summary.nextNiveau?.label ?? summary.nextNiveau?.name ?? null,
    badgeCount: summary.badges?.length ?? 0,
    badges: (summary.badges ?? [])
      .slice(0, 12)
      .map((b) => b.displayLabel ?? b.label ?? b.name)
      .filter(Boolean),
  };
}

function formatSummaryFacts(
  who: string,
  summary: Parameters<typeof redactSummary>[0],
  source: string,
): string[] {
  const redacted = redactSummary(summary);
  return [
    `${who} gamification (${source}).`,
    `Total XP: ${redacted.totalXp ?? 'unavailable'}.`,
    `Level: ${redacted.level ?? 'unavailable'}.`,
    redacted.nextLevel ? `Next level: ${redacted.nextLevel}.` : '',
    `Achievement badges: ${redacted.badgeCount}.`,
    ...(redacted.badges.length
      ? redacted.badges.map((b, i) => `${i + 1}. ${b}`)
      : []),
  ].filter(Boolean);
}
