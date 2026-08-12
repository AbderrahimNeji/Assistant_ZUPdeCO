import type { WorkflowDefinition } from '../workflow.types';

/**
 * "Help me enroll in a course."
 * Find → prerequisites → registration → branch → confirm → enroll → notify
 */
export const enrollCourseWorkflow: WorkflowDefinition = {
  id: 'enroll_course',
  name: 'Course enrollment',
  description:
    'Find a course, check prerequisites and registration, confirm, enroll, and notify.',
  triggerPhrases: [
    /help me enroll/i,
    /enroll me in/i,
    /sign me up for (a |the )?course/i,
    /inscrire.*(cours|course)/i,
    /aide[- ]moi à m['’]?inscrire/i,
  ],
  steps: [
    {
      id: 'find_course',
      name: 'Find course',
      type: 'tool',
      toolId: 'course',
      output: {
        lastToolMessage: 'text',
      },
      continueOnFailure: true,
      retry: { maxAttempts: 2, delayMs: 200 },
      timeoutMs: 20_000,
    },
    {
      id: 'check_prerequisites',
      name: 'Check prerequisites',
      type: 'llm',
      prompt: `You are helping with course enrollment.
User request: {{message}}
Course lookup notes:
{{state.lastToolMessage}}

In 2-4 short sentences, check likely prerequisites / readiness in plain language.
If information is missing, say what the student should verify. Do not invent policy.`,
      output: { prerequisitesSummary: 'text' },
      timeoutMs: 40_000,
    },
    {
      id: 'check_registration',
      name: 'Check registration status',
      type: 'tool',
      toolId: 'registration',
      output: {
        registrationNotes: 'text',
        lastToolMessage: 'text',
      },
      continueOnFailure: true,
      timeoutMs: 20_000,
    },
    {
      id: 'already_enrolled_gate',
      name: 'Already enrolled?',
      type: 'condition',
      condition: {
        // No active rows → proceed to confirm + enroll.
        // Existing registrations → skip enroll step.
        path: 'state.registrationNotes',
        includes: 'no registrations',
        whenTrue: 'ask_confirmation',
        whenFalse: 'skip_enrollment',
      },
    },
    {
      id: 'ask_confirmation',
      name: 'Ask for confirmation',
      type: 'confirmation',
      confirmationMessage:
        'Ready to enroll based on “{{message}}”? Confirm to continue enrollment and notification.',
    },
    {
      id: 'enroll',
      name: 'Enroll',
      type: 'tool',
      toolId: 'enrollment',
      continueOnFailure: true,
      retry: { maxAttempts: 2, delayMs: 300 },
      timeoutMs: 25_000,
    },
    {
      id: 'after_enroll',
      name: 'Continue after enroll',
      type: 'condition',
      condition: {
        path: 'state.message',
        whenTrue: 'notify_student',
      },
    },
    {
      id: 'skip_enrollment',
      name: 'Skip enrollment',
      type: 'llm',
      prompt: `The student may already be registered.
User request: {{message}}
Registration notes: {{state.registrationNotes}}
Prerequisites: {{state.prerequisitesSummary}}

Explain briefly that enrollment was skipped because they appear already registered,
and what they can do next (view registrations, cancel, or ask to enroll in a different course).`,
      output: { skipReason: 'text' },
      timeoutMs: 35_000,
    },
    {
      id: 'notify_student',
      name: 'Notify student',
      type: 'tool',
      toolId: 'notification',
      continueOnFailure: true,
      timeoutMs: 15_000,
    },
    {
      id: 'final_summary',
      name: 'Summarize',
      type: 'llm',
      prompt: `Summarize this enrollment workflow for the student in a short markdown answer.
User request: {{message}}
Workflow state JSON:
{{state}}

Include what succeeded, what was skipped, and next steps.`,
      output: { summary: 'text' },
      timeoutMs: 40_000,
    },
  ],
};
