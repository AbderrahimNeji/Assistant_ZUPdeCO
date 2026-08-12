import { Injectable } from '@nestjs/common';

import { CalendarAdapter } from '../../integration/adapters/calendar.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { answerFacts, apiPartialFacts, safeErrorMessage } from '../skill.utils';

@Injectable()
export class CalendarSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'calendar';
  readonly domains = [
    /\b(calendar|calendrier|planning|schedule|timetable|next session|prochaine séance|prochaine seance|holiday|vacances|post-?it)\b/i,
  ];
  readonly domainTags = ['calendar', 'planning', 'holidays'];
  readonly capabilities: SkillCapability[] = ['list', 'status', 'count', 'search'];

  constructor(
    private readonly calendar: CalendarAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const q = ctx.question;
      const today = new Date();
      const ymd = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const todayStr = ymd(today);
      const wantsToday =
        /\b(today|aujourd['’]?hui|schedule|emploi du temps|planning du jour)\b/i.test(
          q,
        );
      const wantsNext =
        /\b(next|prochaine?)\b/i.test(q) &&
        /\b(session|séance|seance|event|événement)\b/i.test(q);

      const range = wantsToday
        ? { startDate: todayStr, endDate: todayStr }
        : wantsNext
          ? {
              startDate: todayStr,
              endDate: ymd(new Date(today.getTime() + 14 * 86400000)),
            }
          : undefined;

      const timetable = await this.calendar.getTimetable(ctx.user.userId, range);
      const rows = Array.isArray(timetable) ? timetable : [];
      const sessionRows = rows.filter((r) => r.type === 'session');
      if (wantsNext) {
        const next = sessionRows[0] ?? rows[0];
        return {
          skillId: this.id,
          ok: true,
          operation: 'next_calendar_event',
          data: { next, count: rows.length },
          facts: answerFacts({
            answer: next
              ? `Next calendar item: ${next.title} on ${next.date} ${next.time} (${next.type}).`
              : 'No upcoming calendar event in the next 14 days (API returned zero rows).',
            explanation: 'GET /calendar/events for the next 14 days (sessions, post-its, holidays).',
            next: 'Open Calendar, or ask for today’s schedule.',
            source: 'GET /calendar/events',
          }),
        };
      }

      const byType = countBy(rows.map((r) => r.type));
      return {
        skillId: this.id,
        ok: true,
        operation: wantsToday ? 'today_schedule' : 'timetable',
        data: { count: rows.length, byType, rows: rows.slice(0, 20) },
        facts: answerFacts({
          answer: wantsToday
            ? `Today’s schedule: ${rows.length} event(s).`
            : `Calendar events in range: ${rows.length}.`,
          explanation: 'GET /calendar/events (company-scoped). Mixes sessions, post-its and holidays.',
          reasoning: 'This is the same feed as the Calendar page, not a separate events table.',
          next: 'Open Calendar, or ask for the next session.',
          source: 'GET /calendar/events',
          extra: [
            `Breakdown: ${Object.entries(byType)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ') || 'none'}.`,
            rows.length
              ? [
                  '',
                  '| Date | Time | Type | Title | Establishment |',
                  '| --- | --- | --- | --- | --- |',
                  ...rows.slice(0, 12).map(
                    (r) =>
                      `| ${r.date} | ${r.time} | ${r.type} | ${r.title} | ${r.establishment ?? '—'} |`,
                  ),
                ].join('\n')
              : 'No calendar events in the requested range (API returned zero rows).',
          ],
        }),
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

function countBy(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) {
    const key = v || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
