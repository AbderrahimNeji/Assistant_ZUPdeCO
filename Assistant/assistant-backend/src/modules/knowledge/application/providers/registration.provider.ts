import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { RegistrationAdapter } from '../../../integration/adapters/registration.adapter';
import { isEdnovDataSource } from '../../../integration/request-context';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ApplicationKnowledgeProvider,
  ApplicationUserContext,
  matchesAny,
} from '../application-provider.types';

type RegistrationSummary = {
  status: string;
  target: string;
  kind: 'course' | 'program';
  enrolledAt: string;
  studentName?: string;
};

@Injectable()
export class RegistrationKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'registration';

  constructor(
    private readonly prisma: PrismaService,
    private readonly registrations: RegistrationAdapter,
  ) {}

  canHandle(question: string): boolean {
    return matchesAny(question, [
      /\b(registration|registrations|enroll|enrolled|enrollment|inscription|inscrit)\b/i,
      /\b(my courses|mes cours|my programs|mes programmes|assignment|assignments)\b/i,
    ]);
  }

  async retrieve(
    _question: string,
    user: ApplicationUserContext,
  ): Promise<RegistrationSummary[]> {
    if (isEdnovDataSource()) {
      const rows = await this.registrations.listForUser(user.userId, user.role);
      return rows.map((row: {
        status?: string;
        course?: { title?: string } | null;
        program?: { name?: string } | null;
        createdAt?: string;
        student?: { firstName?: string | null; lastName?: string | null };
      }) => ({
        status: String(row.status ?? 'ACTIVE'),
        target: row.course?.title || row.program?.name || 'Session',
        kind: row.program ? ('program' as const) : ('course' as const),
        enrolledAt: String(row.createdAt ?? '').slice(0, 10) || 'n/a',
        studentName: row.student
          ? `${row.student.firstName ?? ''} ${row.student.lastName ?? ''}`.trim()
          : undefined,
      }));
    }

    const where = this.buildWhere(user);

    const rows = await this.prisma.registration.findMany({
      where,
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { title: true } },
        program: { select: { name: true } },
        student: { select: { firstName: true, lastName: true } },
      },
    });

    const includeStudentName =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.COORDINATOR ||
      user.role === UserRole.TUTOR;

    const summaries: RegistrationSummary[] = [];

    for (const row of rows) {
      const studentName = includeStudentName
        ? `${row.student.firstName} ${row.student.lastName}`
        : undefined;
      const enrolledAt = row.createdAt.toISOString().slice(0, 10);

      if (row.course) {
        summaries.push({
          status: row.status,
          target: row.course.title,
          kind: 'course',
          enrolledAt,
          studentName,
        });
        continue;
      }

      if (row.program) {
        summaries.push({
          status: row.status,
          target: row.program.name,
          kind: 'program',
          enrolledAt,
          studentName,
        });
      }
    }

    return summaries;
  }

  formatContext(data: unknown): string {
    const rows = data as RegistrationSummary[];
    if (!rows.length) {
      return 'Registrations: no authorized enrollments found.';
    }

    return [
      'Registrations:',
      ...rows.map((row, index) => {
        const who = row.studentName ? ` — ${row.studentName}` : '';
        return `${index + 1}. [${row.status}] ${row.kind}: ${row.target}${who} (since ${row.enrolledAt})`;
      }),
    ].join('\n');
  }

  private buildWhere(user: ApplicationUserContext) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.COORDINATOR) {
      return {};
    }

    if (user.role === UserRole.TUTOR) {
      return { course: { tutorUserId: user.userId } };
    }

    return { studentUserId: user.userId };
  }
}
