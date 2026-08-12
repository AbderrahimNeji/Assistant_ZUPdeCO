import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class KnowledgeSuggestionContributor implements SuggestionContributor {
  readonly id = 'knowledge';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const hasKb = (context.documentKbCount ?? 0) > 0;
    const hasAppDb = (context.knowledgeProviders?.length ?? 0) > 0;
    const isRag =
      context.plannerMode === 'rag' || context.plannerMode === 'hybrid';

    if (!isRag && !hasKb && !hasAppDb) return [];

    const suggestions: SuggestedAction[] = [];

    if (hasAppDb && context.knowledgeProviders?.includes('policy')) {
      suggestions.push({
        id: 'knowledge.policies',
        label: 'Explain related policies',
        type: 'follow_up_question',
        payload: { message: 'What policies apply to this?' },
      });
    }

    if (hasKb) {
      suggestions.push({
        id: 'knowledge.more_detail',
        label: 'Go deeper on this topic',
        type: 'follow_up_question',
        payload: {
          message: `Can you explain more about: ${truncate(context.question, 80)}`,
        },
      });
      suggestions.push({
        id: 'knowledge.generate_summary',
        label: 'Generate summary',
        type: 'follow_up_question',
        payload: {
          message: 'Generate a short coordinator summary of this topic',
        },
      });
    }

    if (
      context.knowledgeProviders?.includes('business_intelligence') ||
      context.plannerMode === 'hybrid'
    ) {
      suggestions.push({
        id: 'knowledge.open_report',
        label: 'Open report',
        type: 'follow_up_question',
        payload: { message: 'Open or summarize the relevant report' },
      });
    }

    if (context.knowledgeProviders?.includes('faq')) {
      suggestions.push({
        id: 'knowledge.faq',
        label: 'Related FAQs',
        type: 'follow_up_question',
        payload: { message: 'Show related FAQs' },
      });
    }

    return suggestions;
  }
}

function truncate(value: string, max: number) {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
