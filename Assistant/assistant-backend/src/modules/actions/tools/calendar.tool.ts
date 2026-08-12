import { Injectable } from '@nestjs/common';

import { CalendarApplicationService } from '../application/domain-application.services';
import {
  ApplicationTool,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolUserContext,
  ToolValidationResult,
  matchesAny,
} from '../tool.types';

@Injectable()
export class CalendarTool implements ApplicationTool {
  readonly id = 'calendar';
  readonly description =
    'Show the user’s timetable derived from active course registrations';

  constructor(private readonly calendar: CalendarApplicationService) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(timetable|schedule|agenda|calendar)\b/i,
      /\b(emploi du temps|planning)\b/i,
      /\b(show|what).*\b(my\s+)?(classes|sessions)\b.*\b(today|week|when)\b/i,
    ]);
  }

  validate(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    void input;
    void user;
    return Promise.resolve({ ok: true, payload: { timetable: true } });
  }

  async execute(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<unknown> {
    void input;
    return this.calendar.getTimetable(user.userId);
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    void status;
    const rows = data as Array<{
      weekday: string;
      time: string;
      course: string;
      tutor: string | null;
    }>;

    if (!rows?.length) {
      return 'Your timetable is empty. Enroll in a course to see scheduled sessions.';
    }

    return [
      'Your timetable:',
      ...rows.map(
        (slot, index) =>
          `${index + 1}. ${slot.weekday} ${slot.time} — ${slot.course}` +
          (slot.tutor ? ` (tutor: ${slot.tutor})` : ''),
      ),
    ].join('\n');
  }
}
