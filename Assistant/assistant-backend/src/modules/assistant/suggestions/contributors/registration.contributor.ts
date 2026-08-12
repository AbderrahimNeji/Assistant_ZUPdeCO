import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class RegistrationSuggestionContributor implements SuggestionContributor {
  readonly id = 'registration';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const related =
      context.plannerTools?.includes('registration') ||
      context.executedToolIds?.includes('registration') ||
      context.knowledgeProviders?.includes('registration') ||
      /\b(enroll|registration|registered|inscrit)\b/i.test(context.question) ||
      /\benrolled\b/i.test(context.answer);

    if (!related) return [];

    return [
      {
        id: 'registration.timetable',
        label: 'Show my timetable',
        type: 'tool_action',
        payload: { toolId: 'calendar', message: 'Show my timetable' },
      },
      {
        id: 'registration.meet_tutor',
        label: 'Meet my tutor',
        type: 'tool_action',
        payload: { toolId: 'tutor', message: 'Find my tutor' },
      },
      {
        id: 'registration.handbook',
        label: 'Download course handbook',
        type: 'download',
        payload: {
          toolId: 'document',
          message: 'Download my course handbook',
        },
      },
      {
        id: 'registration.cancel',
        label: 'Cancel a registration',
        type: 'follow_up_question',
        payload: { message: 'Cancel my registration' },
      },
    ];
  }
}
