import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class CalendarSuggestionContributor implements SuggestionContributor {
  readonly id = 'calendar';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const related =
      context.plannerTools?.includes('calendar') ||
      context.executedToolIds?.includes('calendar') ||
      /\b(timetable|schedule|agenda|calendar)\b/i.test(context.question) ||
      /\benrolled\b/i.test(context.answer);

    if (!related) return [];

    return [
      {
        id: 'calendar.today',
        label: 'What do I have this week?',
        type: 'follow_up_question',
        payload: { message: 'What sessions do I have this week?' },
      },
      {
        id: 'calendar.create_session',
        label: 'Create session',
        type: 'follow_up_question',
        payload: {
          message: 'Help me create a session correctly',
        },
      },
      {
        id: 'calendar.registrations',
        label: 'Show my registrations',
        type: 'tool_action',
        payload: {
          toolId: 'registration',
          message: 'Show my registrations',
        },
      },
    ];
  }
}
