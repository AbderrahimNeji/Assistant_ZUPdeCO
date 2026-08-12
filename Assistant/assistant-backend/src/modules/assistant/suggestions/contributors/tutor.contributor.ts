import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class TutorSuggestionContributor implements SuggestionContributor {
  readonly id = 'tutor';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const related =
      context.plannerTools?.includes('tutor') ||
      context.executedToolIds?.includes('tutor') ||
      context.knowledgeProviders?.includes('tutor') ||
      /\b(tutor|tuteur|teacher)\b/i.test(context.question);

    if (!related) return [];

    const kinds = new Set(
      (context.focusedEntityKinds ?? []).map((k) => k.toLowerCase()),
    );
    const label = context.selectionLabel?.trim();
    const focused =
      kinds.has('tutor') || context.selectionType?.toLowerCase() === 'tutor';

    if (focused) {
      return [
        {
          id: 'tutor.timetable',
          label: 'View timetable',
          type: 'follow_up_question',
          payload: {
            message: label
              ? `Show the timetable / sessions for tutor ${label}`
              : 'Show the timetable / sessions for this tutor',
          },
        },
        {
          id: 'tutor.assigned_students',
          label: 'Show assigned students',
          type: 'follow_up_question',
          payload: {
            message: label
              ? `Which students are assigned to ${label}?`
              : 'Which students are assigned to this tutor?',
          },
        },
        {
          id: 'tutor.open_reports',
          label: 'Open reports',
          type: 'follow_up_question',
          payload: {
            message: label
              ? `Open or summarize reports for tutor ${label}`
              : 'Open or summarize reports for this tutor',
          },
        },
        {
          id: 'tutor.notify_coordinator',
          label: 'Notify coordinator',
          type: 'follow_up_question',
          payload: {
            message: label
              ? `What should I notify the coordinator about regarding tutor ${label}?`
              : 'What should I notify the coordinator about regarding this tutor?',
          },
        },
        {
          id: 'tutor.schedule_session',
          label: 'Schedule new session',
          type: 'follow_up_question',
          payload: {
            message: label
              ? `Help me schedule a new session with tutor ${label}`
              : 'Help me schedule a new session with this tutor',
          },
        },
      ];
    }

    return [
      {
        id: 'tutor.available_today',
        label: 'Available today',
        type: 'follow_up_question',
        payload: { message: 'Which tutors are available today?' },
      },
      {
        id: 'tutor.no_students',
        label: 'No assigned students',
        type: 'follow_up_question',
        payload: { message: 'Which tutors have no assigned students?' },
      },
      {
        id: 'tutor.workload',
        label: 'Highest workload',
        type: 'follow_up_question',
        payload: { message: 'Which tutors have the highest workload?' },
      },
      {
        id: 'tutor.show',
        label: 'Show tutor',
        type: 'follow_up_question',
        payload: { message: 'Summarize the focused tutor profile' },
      },
      {
        id: 'tutor.schedule_session',
        label: 'Schedule new session',
        type: 'follow_up_question',
        payload: {
          message: 'Help me schedule a new tutoring session',
        },
      },
    ];
  }
}
