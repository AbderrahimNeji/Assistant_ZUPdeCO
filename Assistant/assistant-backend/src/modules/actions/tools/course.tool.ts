import { Injectable } from '@nestjs/common';

import { CourseApplicationService } from '../application/domain-application.services';
import {
  ApplicationTool,
  ToolExecuteInput,
  ToolExecutionStatus,
  ToolValidationResult,
  asString,
  matchesAny,
} from '../tool.types';

@Injectable()
export class CourseTool implements ApplicationTool {
  readonly id = 'course';
  readonly description = 'List and search published courses';

  constructor(private readonly courses: CourseApplicationService) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(list|show|find|search|what)\b.*\b(course|courses|class|classes)\b/i,
      /\b(course|courses)\b.*\b(available|catalog|list)\b/i,
      /\b(cours|matière|matieres)\b/i,
    ]);
  }

  async validate(input: ToolExecuteInput): Promise<ToolValidationResult> {
    if (input.actionId === 'enroll_course' && input.payload?.courseId) {
      return {
        ok: true,
        payload: { courseId: asString(input.payload.courseId) },
      };
    }

    const keyword = extractCourseKeyword(input.rawMessage);
    const rows = keyword
      ? await this.courses.findPublishedByName(keyword)
      : await this.courses.listPublished(8);

    if (!rows.length) {
      return {
        ok: false,
        error: 'No published courses matched your request.',
        recoveryActions: [
          {
            id: 'list_courses',
            label: 'List courses',
            toolId: this.id,
            style: 'secondary',
          },
        ],
      };
    }

    return {
      ok: true,
      proposal: {
        message:
          rows.length === 1
            ? `I found the course “${rows[0].title}”.`
            : `I found ${rows.length} courses that may match.`,
        actions: rows.slice(0, 5).map((course) => ({
          id: 'enroll_course',
          label: `Enroll · ${course.title}`,
          toolId: 'enrollment',
          style: 'primary' as const,
          payload: { courseId: course.id, courseTitle: course.title },
        })),
      },
      payload: { courses: rows },
    };
  }

  async execute(input: ToolExecuteInput): Promise<unknown> {
    const keyword = extractCourseKeyword(input.rawMessage);
    if (keyword) {
      return this.courses.findPublishedByName(keyword);
    }
    return this.courses.listPublished(8);
  }

  formatResult(data: unknown, status: ToolExecutionStatus): string {
    if (status === 'proposal') {
      return '';
    }
    const rows = data as Array<{
      title: string;
      subject: string | null;
      level: string | null;
    }>;
    if (!rows?.length) {
      return 'No published courses are available right now.';
    }
    return [
      'Published courses:',
      ...rows.map(
        (course, index) =>
          `${index + 1}. ${course.title}` +
          (course.subject ? ` [${course.subject}]` : '') +
          (course.level ? ` (${course.level})` : ''),
      ),
    ].join('\n');
  }
}

function extractCourseKeyword(message: string): string | null {
  const cleaned = message
    .replace(
      /\b(list|show|find|search|what|are|the|available|course|courses|class|classes|catalog|about|for|me|my|cours)\b/gi,
      ' ',
    )
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.split(/\s+/).slice(0, 6).join(' ');
}
