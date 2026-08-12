import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class AttachmentSuggestionContributor implements SuggestionContributor {
  readonly id = 'attachment';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const count = context.conversationAttachmentCount ?? 0;
    const hasAttachmentMention =
      count > 0 ||
      /\[Attached:/i.test(context.question) ||
      /\b(handbook|pdf|upload|attached|attachment)\b/i.test(context.question);

    if (!hasAttachmentMention) return [];

    const fileHint =
      context.sourceTitles?.find((title) =>
        /\.(pdf|docx?|txt|md)$/i.test(title),
      ) ?? 'the attached file';

    return [
      {
        id: 'attachment.summarize_ch3',
        label: 'Summarize chapter 3',
        type: 'follow_up_question',
        payload: {
          message: `Summarize chapter 3 from ${fileHint}`,
        },
      },
      {
        id: 'attachment.deadlines',
        label: 'List important deadlines',
        type: 'follow_up_question',
        payload: {
          message: `List important deadlines in ${fileHint}`,
        },
      },
      {
        id: 'attachment.policies',
        label: 'Extract key policies',
        type: 'follow_up_question',
        payload: {
          message: `Extract key policies from ${fileHint}`,
        },
      },
    ];
  }
}
