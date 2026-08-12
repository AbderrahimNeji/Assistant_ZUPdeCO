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

type ProgramSummary = {
  name: string;
  description: string;
};

@Injectable()
export class ProgramKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'program';

  constructor(
    private readonly prisma: PrismaService,
    private readonly academic: AcademicAdapter,
  ) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(program|programs|programme|programmes|track|tracks|parcours)\b/i,
    ]);
  }

  async retrieve(
    question: string,
    user: ApplicationUserContext,
  ): Promise<ProgramSummary[]> {
    if (isEdnovDataSource()) {
      const keyword = question
        .replace(
          /\b(program|programs|programme|programmes|track|parcours|what|which|list|show|the|a|an)\b/gi,
          ' ',
        )
        .trim();
      const courses = keyword
        ? await this.academic.findProgramsByName(keyword)
        : await this.academic.listProgramsAsCourses(8);
      return courses.map((course) => ({
        name: course.title,
        description: truncate(course.description, 280),
      }));
    }

    const keyword = question
      .replace(
        /\b(program|programs|programme|programmes|track|parcours|what|which|list|show|the|a|an)\b/gi,
        ' ',
      )
      .trim();

    const programs = await this.prisma.program.findMany({
      where: {
        AND: [
          isStaff(user.role) ? {} : { isPublished: true },
          keyword
            ? {
                OR: [
                  { name: { contains: keyword, mode: 'insensitive' } },
                  { description: { contains: keyword, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
    });

    return programs.map((program) => ({
      name: program.name,
      description: truncate(program.description, 280),
    }));
  }

  formatContext(data: unknown): string {
    const rows = data as ProgramSummary[];
    if (!rows.length) {
      return 'Programs: no matching programs found.';
    }

    return [
      'Programs:',
      ...rows.map(
        (program, index) =>
          `${index + 1}. ${program.name}\n   ${program.description}`,
      ),
    ].join('\n');
  }
}

function truncate(value: string, max: number) {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
