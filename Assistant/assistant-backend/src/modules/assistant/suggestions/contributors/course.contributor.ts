import { Injectable } from '@nestjs/common';

import type {
  SuggestedAction,
  SuggestionContext,
  SuggestionContributor,
} from '../suggestion.types';

@Injectable()
export class CourseSuggestionContributor implements SuggestionContributor {
  readonly id = 'course';

  contribute(context: SuggestionContext): SuggestedAction[] {
    const related =
      context.plannerTools?.includes('course') ||
      context.executedToolIds?.includes('course') ||
      context.knowledgeProviders?.includes('course') ||
      (context.plannerMode === 'rag' &&
        /\b(course|courses|curriculum|syllabus|AI Foundations)\b/i.test(
          context.question,
        ));

    if (!related) return [];

    const courseName =
      /\b(AI Foundations|Mathematics Foundations|French Literacy)\b/i.exec(
        `${context.question} ${context.answer}`,
      )?.[1] ?? 'AI Foundations';

    return [
      {
        id: 'course.enroll',
        label: `Enroll in ${courseName}`,
        type: 'tool_action',
        payload: {
          toolId: 'enrollment',
          message: `Enroll me in ${courseName}`,
        },
      },
      {
        id: 'course.syllabus',
        label: 'View syllabus',
        type: 'follow_up_question',
        payload: { message: `What is the syllabus for ${courseName}?` },
      },
      {
        id: 'course.tutor',
        label: 'Meet the tutor',
        type: 'tool_action',
        payload: {
          toolId: 'tutor',
          message: `Who is the tutor for ${courseName}?`,
        },
      },
      {
        id: 'course.browse',
        label: 'Browse courses',
        type: 'tool_action',
        payload: { toolId: 'course', message: 'List available courses' },
      },
    ];
  }
}
