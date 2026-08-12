import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class NotificationSuggestionContributor implements SuggestionContributor {
  readonly id = 'notification';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const related =
      context.plannerTools?.includes('notification') ||
      context.executedToolIds?.includes('notification') ||
      /\b(notification|notify|inbox)\b/i.test(context.question);

    if (!related) return [];

    return [
      {
        id: 'notification.inbox',
        label: 'Check notifications',
        type: 'tool_action',
        payload: {
          toolId: 'notification',
          message: 'Show my notifications',
        },
      },
    ];
  }
}
