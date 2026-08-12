import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { UserAdapter } from '../../../integration/adapters/user.adapter';
import { isEdnovDataSource } from '../../../integration/request-context';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ApplicationKnowledgeProvider,
  ApplicationUserContext,
  isStaff,
  matchesAny,
} from '../application-provider.types';

type TutorSummary = {
  name: string;
  email: string | null;
  subjects: string[];
};

@Injectable()
export class TutorKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'tutor';

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserAdapter,
  ) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(tutor|tutors|teacher|teachers|mentor|mentors)\b/i,
      /\b(tuteur|tuteurs|prof|professeur|enseignants?)\b/i,
    ]);
  }

  async retrieve(
    question: string,
    user: ApplicationUserContext,
  ): Promise<TutorSummary[]> {
    if (isEdnovDataSource()) {
      const keyword = question
        .replace(
          /\b(tutor|tutors|teacher|teachers|mentor|mentors|tuteur|tuteurs|prof|professeur|enseignants?|who|list|show|find|the|a|an)\b/gi,
          ' ',
        )
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .trim()
        .split(/\s+/)
        .find((part) => part.length > 2);

      const tutors = keyword
        ? await this.users.findTutorsByName(keyword)
        : await this.users.listTutors(8);

      return tutors.map((tutor) => ({
        name: `${tutor.firstName} ${tutor.lastName}`,
        email: isStaff(user.role) || tutor.id === user.userId ? null : null,
        subjects: tutor.coursesTaught.map((c) => c.subject || c.title),
      }));
    }

    const keyword = question
      .replace(
        /\b(tutor|tutors|teacher|teachers|mentor|mentors|tuteur|tuteurs|prof|professeur|enseignants?|who|list|show|find|the|a|an)\b/gi,
        ' ',
      )
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .trim()
      .split(/\s+/)
      .find((part) => part.length > 2);

    const tutors = await this.prisma.user.findMany({
      where: {
        role: UserRole.TUTOR,
        ...(keyword
          ? {
              OR: [
                { firstName: { contains: keyword, mode: 'insensitive' } },
                { lastName: { contains: keyword, mode: 'insensitive' } },
                {
                  coursesTaught: {
                    some: {
                      OR: [
                        { title: { contains: keyword, mode: 'insensitive' } },
                        { subject: { contains: keyword, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        coursesTaught: {
          where: isStaff(user.role) ? {} : { isPublished: true },
          select: { subject: true, title: true },
          take: 5,
        },
      },
    });

    return tutors.map((tutor) => ({
      name: `${tutor.firstName} ${tutor.lastName}`,
      email:
        isStaff(user.role) || tutor.id === user.userId ? tutor.email : null,
      subjects: [
        ...new Set(
          tutor.coursesTaught
            .map((course) => course.subject || course.title)
            .filter(Boolean),
        ),
      ] as string[],
    }));
  }

  formatContext(data: unknown): string {
    const rows = data as TutorSummary[];
    if (!rows.length) {
      return 'Tutors: no matching tutors found.';
    }

    return [
      'Tutors:',
      ...rows.map(
        (tutor, index) =>
          `${index + 1}. ${tutor.name}` +
          (tutor.subjects.length
            ? `\n   Subjects/courses: ${tutor.subjects.join(', ')}`
            : ''),
      ),
    ].join('\n');
  }
}
