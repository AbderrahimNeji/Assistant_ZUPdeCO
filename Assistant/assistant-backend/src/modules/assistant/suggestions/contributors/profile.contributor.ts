import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class ProfileSuggestionContributor implements SuggestionContributor {
  readonly id = 'profile';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const related =
      context.plannerTools?.includes('profile') ||
      context.executedToolIds?.includes('profile') ||
      /\b(profile|who am i|my name|account)\b/i.test(context.question);

    if (!related) return [];

    return [
      {
        id: 'profile.update_name',
        label: 'Update my name',
        type: 'follow_up_question',
        payload: { message: 'Update my first name to ' },
      },
      {
        id: 'profile.view',
        label: 'View profile',
        type: 'tool_action',
        payload: { toolId: 'profile', message: 'Show my profile' },
      },
    ];
  }
}
