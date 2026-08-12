import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class EnrollmentSuggestionContributor implements SuggestionContributor {
  readonly id = 'enrollment';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const q = context.question.toLowerCase();
    const mentionedCourse = extractCourseMention(context);
    const related =
      context.plannerTools?.includes('enrollment') ||
      context.executedToolIds?.includes('enrollment') ||
      context.knowledgeProviders?.includes('course') ||
      /\b(course|courses|enroll|enrol|ai foundations)\b/i.test(q);

    if (!related) return [];

    // Already listing enrollments — registration contributor owns next steps.
    if (/\benrolled\b/i.test(context.answer)) {
      return [];
    }

    const suggestions: SuggestedAction[] = [];

    if (mentionedCourse && !/\benroll/i.test(context.answer)) {
      suggestions.push({
        id: 'enrollment.enroll_mentioned',
        label: `Enroll in ${mentionedCourse}`,
        type: 'tool_action',
        payload: {
          toolId: 'enrollment',
          message: `Enroll me in ${mentionedCourse}`,
        },
      });
    } else if (!context.executedToolIds?.includes('enrollment')) {
      suggestions.push({
        id: 'enrollment.enroll_prompt',
        label: 'Enroll in a course',
        type: 'follow_up_question',
        payload: { message: 'Enroll me in AI Foundations' },
      });
    }

    suggestions.push({
      id: 'enrollment.view_registrations',
      label: 'Show my registrations',
      type: 'tool_action',
      payload: {
        toolId: 'registration',
        message: 'Show my registrations',
      },
    });

    return suggestions;
  }
}

function extractCourseMention(context: SuggestionContext): string | null {
  const fromSources = context.sourceTitles?.find((title) =>
    /foundations|course|literacy|mathematics/i.test(title),
  );
  if (fromSources) return fromSources.replace(/\.[a-z0-9]+$/i, '');

  const match =
    /\b(AI Foundations|Mathematics Foundations|French Literacy)\b/i.exec(
      `${context.question} ${context.answer}`,
    );
  return match?.[1] ?? null;
}
