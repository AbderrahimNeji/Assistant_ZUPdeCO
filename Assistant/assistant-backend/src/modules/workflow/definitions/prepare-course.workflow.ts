import type { WorkflowDefinition } from '../workflow.types';

/**
 * "Prepare me for AI Foundations."
 * Find course → documents → summarize → tutor → study checklist
 */
export const prepareCourseWorkflow: WorkflowDefinition = {
  id: 'prepare_course',
  name: 'Course prep',
  description:
    'Prepare for a course with materials, tutor options, and a study checklist.',
  triggerPhrases: [
    /prepare me for/i,
    /help me prepare for/i,
    /study plan for/i,
    /prépare[- ]moi pour/i,
    /AI Foundations/i,
  ],
  steps: [
    {
      id: 'find_course',
      name: 'Find course',
      type: 'tool',
      toolId: 'course',
      continueOnFailure: true,
      timeoutMs: 20_000,
    },
    {
      id: 'retrieve_handbook',
      name: 'Retrieve handbook',
      type: 'tool',
      toolId: 'document',
      continueOnFailure: true,
      timeoutMs: 20_000,
    },
    {
      id: 'summarize_handbook',
      name: 'Summarize handbook',
      type: 'llm',
      prompt: `Create a concise study briefing for: {{message}}
Use this context from tools when present:
{{state.lastToolMessage}}

Write:
1) What the course likely covers
2) 3 focus areas for week 1
Keep it practical and short.`,
      output: { handbookSummary: 'text' },
      timeoutMs: 45_000,
    },
    {
      id: 'show_tutor',
      name: 'Show tutor',
      type: 'tool',
      toolId: 'tutor',
      continueOnFailure: true,
      timeoutMs: 20_000,
    },
    {
      id: 'study_checklist',
      name: 'Generate study checklist',
      type: 'llm',
      prompt: `Based on the user request “{{message}}” and this state:
{{state}}

Produce a markdown study checklist (5–8 items) to prepare for the course.
End with one suggested next action.`,
      output: { checklist: 'text' },
      timeoutMs: 45_000,
    },
  ],
};
