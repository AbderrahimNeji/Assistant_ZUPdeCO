import { Injectable } from '@nestjs/common';

import { AcademicAdapter } from '../../../integration/adapters/academic.adapter';
import { isEdnovDataSource } from '../../../integration/request-context';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ApplicationKnowledgeProvider,
  ApplicationUserContext,
  isStaff,
  matchesAny,
} from '../application-provider.types';

type CourseSummary = {
  title: string;
  subject: string | null;
  level: string | null;
  tutorName: string | null;
  description: string;
};

@Injectable()
export class CourseKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'course';

  constructor(
    private readonly prisma: PrismaService,
    private readonly academic: AcademicAdapter,
  ) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(course|courses|class|classes|subject|curriculum|module)\b/i,
      /\b(cours|matière|matieres|classe|classes|programme|program)\b/i,
    ]);
  }

  async retrieve(
    question: string,
    user: ApplicationUserContext,
  ): Promise<CourseSummary[]> {
    if (isEdnovDataSource()) {
      const keyword = extractKeyword(question);
      const courses = keyword
        ? await this.academic.findProgramsByName(keyword)
        : await this.academic.listProgramsAsCourses(8);
      return courses.map((course) => ({
        title: course.title,
        subject: course.subject,
        level: course.level,
        tutorName: course.tutor
          ? `${course.tutor.firstName} ${course.tutor.lastName}`
          : null,
        description: truncate(course.description, 280),
      }));
    }

    const keyword = extractKeyword(question);

    const courses = await this.prisma.course.findMany({
      where: {
        AND: [
          isStaff(user.role)
            ? {}
            : {
                OR: [{ isPublished: true }, { tutorUserId: user.userId }],
              },
          keyword
            ? {
                OR: [
                  { title: { contains: keyword, mode: 'insensitive' } },
                  { subject: { contains: keyword, mode: 'insensitive' } },
                  { description: { contains: keyword, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: {
        tutor: { select: { firstName: true, lastName: true } },
      },
    });

    return courses.map((course) => ({
      title: course.title,
      subject: course.subject,
      level: course.level,
      tutorName: course.tutor
        ? `${course.tutor.firstName} ${course.tutor.lastName}`
        : null,
      description: truncate(course.description, 280),
    }));
  }

  formatContext(data: unknown): string {
    const rows = data as CourseSummary[];
    if (!rows.length) {
      return 'Courses: no matching published courses found for this user.';
    }

    return [
      'Courses:',
      ...rows.map(
        (course, index) =>
          `${index + 1}. ${course.title}` +
          (course.subject ? ` [${course.subject}]` : '') +
          (course.level ? ` (${course.level})` : '') +
          (course.tutorName ? ` — tutor: ${course.tutorName}` : '') +
          `\n   ${course.description}`,
      ),
    ].join('\n');
  }
}

function extractKeyword(question: string): string | null {
  const cleaned = question
    .replace(
      /\b(course|courses|class|classes|subject|cours|matière|programme|program|what|which|list|show|about|the|a|an|is|are|my|mes|les|des)\b/gi,
      ' ',
    )
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim();
  if (!cleaned) return null;
  const token = cleaned.split(/\s+/).find((part) => part.length > 2);
  return token ?? null;
}

function truncate(value: string, max: number) {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
