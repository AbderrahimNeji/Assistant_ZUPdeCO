import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class BenchmarkSuggestionContributor implements SuggestionContributor {
  readonly id = 'benchmark';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const related =
      /\b(benchmark|evaluation|eval run|failed questions|accuracy)\b/i.test(
        context.question,
      ) || /\b(benchmark|score|failed questions)\b/i.test(context.answer);

    if (!related) return [];

    return [
      {
        id: 'benchmark.compare',
        label: 'Compare with previous run',
        type: 'navigation',
        payload: { href: '/benchmarks' },
      },
      {
        id: 'benchmark.export_csv',
        label: 'Export CSV',
        type: 'navigation',
        payload: { href: '/benchmarks' },
      },
      {
        id: 'benchmark.failed',
        label: 'View failed questions',
        type: 'follow_up_question',
        payload: { message: 'Show the failed benchmark questions' },
      },
    ];
  }
}
