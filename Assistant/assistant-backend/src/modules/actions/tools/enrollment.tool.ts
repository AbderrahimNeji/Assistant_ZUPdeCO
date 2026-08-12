import { Injectable } from '@nestjs/common';

import {
  CourseApplicationService,
  RegistrationApplicationService,
} from '../application/domain-application.services';
import {
  ApplicationTool,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolUserContext,
  ToolValidationResult,
  asString,
  matchesAny,
} from '../tool.types';

@Injectable()
export class EnrollmentTool implements ApplicationTool {
  readonly id = 'enrollment';
  readonly description = 'Enroll the authenticated user in a published course';

  constructor(
    private readonly courses: CourseApplicationService,
    private readonly registrations: RegistrationApplicationService,
  ) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(enroll|enrol|register|sign up|join)\b.*\b(course|class|program)?\b/i,
      /\b(inscription|inscrire|inscris)\b/i,
    ]);
  }

  async validate(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<ToolValidationResult> {
    const courseId =
      typeof input.payload?.courseId === 'string'
        ? input.payload.courseId
        : undefined;

    if (courseId) {
      const course = await this.courses.findPublishedById(courseId);
      return {
        ok: true,
        payload: { courseId: course.id, courseTitle: course.title },
        proposal:
          input.actionId === 'enroll_course'
            ? undefined
            : {
                message: `I found the course “${course.title}”.`,
                actions: [
                  {
                    id: 'enroll_course',
                    label: 'Enroll',
                    toolId: this.id,
                    style: 'primary',
                    payload: { courseId: course.id, courseTitle: course.title },
                  },
                ],
              },
      };
    }

    const name = extractEnrollmentTarget(input.rawMessage);
    if (!name) {
      return {
        ok: false,
        error:
          'Please specify which course to enroll in (for example: “Enroll me in AI Foundations”).',
        recoveryActions: [
          {
            id: 'list_courses',
            label: 'Browse courses',
            toolId: 'course',
            style: 'secondary',
          },
        ],
      };
    }

    const matches = await this.courses.findPublishedByName(name);
    if (!matches.length) {
      return {
        ok: false,
        error: `I could not find a published course matching “${name}”.`,
        recoveryActions: [
          {
            id: 'list_courses',
            label: 'Browse courses',
            toolId: 'course',
            style: 'secondary',
          },
        ],
      };
    }

    if (matches.length > 1 && input.actionId !== 'enroll_course') {
      return {
        ok: true,
        proposal: {
          message: `Several courses match “${name}”. Which one should I enroll you in?`,
          actions: matches.map((course) => ({
            id: 'enroll_course',
            label: `Enroll · ${course.title}`,
            toolId: this.id,
            style: 'primary' as const,
            payload: { courseId: course.id, courseTitle: course.title },
          })),
        },
      };
    }

    const course = matches[0];
    if (input.actionId === 'enroll_course') {
      return {
        ok: true,
        payload: { courseId: course.id, courseTitle: course.title },
      };
    }

    return {
      ok: true,
      proposal: {
        message: `I found the course “${course.title}”.`,
        actions: [
          {
            id: 'enroll_course',
            label: 'Enroll',
            toolId: this.id,
            style: 'primary',
            payload: { courseId: course.id, courseTitle: course.title },
          },
        ],
      },
      payload: {
        courseId: course.id,
        courseTitle: course.title,
        userId: user.userId,
      },
    };
  }

  async execute(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<unknown> {
    const courseId = asString(input.payload?.courseId);
    return this.registrations.enrollInCourse(user.userId, user.role, courseId);
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    if (status !== 'executed') return '';
    const row = data as {
      course?: { title?: string } | null;
    };
    const title = row.course?.title ?? 'the course';
    return `You are now enrolled in “${title}”.`;
  }
}

function extractEnrollmentTarget(message: string): string | null {
  const patterns = [
    /\b(?:enroll|enrol|register|sign up|join)(?:\s+me)?(?:\s+in|\s+for|\s+to)?\s+(.+)$/i,
    /\b(?:inscrire|inscris)(?:\s+moi)?(?:\s+à|\s+a|\s+au|\s+en)?\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(message.trim());
    if (match?.[1]) {
      return match[1].replace(/[?.!]+$/, '').trim();
    }
  }
  return null;
}
