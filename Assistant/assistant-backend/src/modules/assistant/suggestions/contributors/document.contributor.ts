import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class DocumentSuggestionContributor implements SuggestionContributor {
  readonly id = 'document';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const related =
      context.plannerTools?.includes('document') ||
      context.executedToolIds?.includes('document') ||
      (context.documentKbCount ?? 0) > 0 ||
      /\b(document|documents|certificate|handbook)\b/i.test(context.question);

    if (!related) return [];

    return [
      {
        id: 'document.list',
        label: 'List my documents',
        type: 'tool_action',
        payload: { toolId: 'document', message: 'List my documents' },
      },
      {
        id: 'document.open_library',
        label: 'Open documents library',
        type: 'navigation',
        payload: { href: '/documents' },
      },
      {
        id: 'document.certificate',
        label: 'Download my certificate',
        type: 'download',
        payload: {
          toolId: 'document',
          message: 'Download my certificate',
        },
      },
    ];
  }
}
