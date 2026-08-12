import type { WorkflowDefinition } from '../workflow.types';

/**
 * "Compare my benchmark with last month."
 * History → compare → summary → export-oriented report
 */
export const compareBenchmarkWorkflow: WorkflowDefinition = {
  id: 'compare_benchmark',
  name: 'Benchmark comparison',
  description:
    'Compare recent assistant quality / benchmark signals and draft an exportable summary.',
  triggerPhrases: [
    /compare my benchmark/i,
    /benchmark with last month/i,
    /benchmark (report|comparison|history)/i,
    /comparer.*(benchmark|évaluation)/i,
  ],
  steps: [
    {
      id: 'retrieve_history',
      name: 'Retrieve benchmark history',
      type: 'llm',
      prompt: `The user asked: {{message}}

Draft a realistic structured view of “benchmark history” for an AI assistant product
(quality score, latency, tool success rate) comparing this month vs last month.
Use plausible ranges and label estimates clearly as illustrative if live metrics are unavailable.
Return compact markdown with a small table.`,
      output: { history: 'text' },
      timeoutMs: 45_000,
    },
    {
      id: 'compare_scores',
      name: 'Compare scores',
      type: 'llm',
      prompt: `Using this history draft:
{{state.history}}

Compare scores vs last month in 4 bullets: wins, regressions, risk, confidence.`,
      output: { comparison: 'text' },
      timeoutMs: 40_000,
    },
    {
      id: 'generate_summary',
      name: 'Generate summary',
      type: 'llm',
      prompt: `Combine history and comparison into an executive summary for:
{{message}}

History:
{{state.history}}

Comparison:
{{state.comparison}}

Keep under 180 words.`,
      output: { summary: 'text' },
      timeoutMs: 40_000,
    },
    {
      id: 'export_report',
      name: 'Export report',
      type: 'llm',
      prompt: `Format a copy-pasteable markdown report titled “Benchmark comparison”.
Include sections: Overview, Scores, Changes, Recommendations.
Source material:
Summary: {{state.summary}}
Comparison: {{state.comparison}}
History: {{state.history}}`,
      output: { report: 'text' },
      timeoutMs: 45_000,
    },
  ],
};
