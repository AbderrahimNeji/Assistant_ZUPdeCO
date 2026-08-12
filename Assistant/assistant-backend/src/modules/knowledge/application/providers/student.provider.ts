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

type StudentSummary = {
  name: string;
  email: string | null;
  role: UserRole;
  status?: string | null;
  establishment?: string | null;
  activeRegistrations: number;
};

@Injectable()
export class StudentKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'student';

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserAdapter,
  ) {}

  canHandle(question: string, user: ApplicationUserContext): boolean {
    if (
      matchesAny(question, [
        /\b(student|students|learner|learners|élève|eleve|élèves|eleves)\b/i,
        /\b(inscrits?|accompagnés?|désactivés?|onboarding)\b/i,
      ])
    ) {
      return true;
    }

    return (
      user.role === UserRole.STUDENT &&
      matchesAny(question, [/\b(my studies|my classes|mon parcours)\b/i])
    );
  }

  async retrieve(
    _question: string,
    user: ApplicationUserContext,
  ): Promise<StudentSummary[]> {
    if (isEdnovDataSource()) {
      if (user.role === UserRole.STUDENT) {
        return [
          {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
            activeRegistrations: 0,
          },
        ];
      }

      if (!isStaff(user.role) && user.role !== UserRole.TUTOR) {
        return [];
      }

      const focusedId = this.users.resolveFocusedStudentId();
      if (focusedId) {
        const student = await this.users.findStudentById(focusedId);
        const est = student.userEstablishments?.[0]?.establishment;
        return [
          {
            name: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
            email: student.email ?? null,
            role: UserRole.STUDENT,
            status: student.status ?? null,
            establishment: est?.name ?? null,
            activeRegistrations: 0,
          },
        ];
      }

      const students = await this.users.listStudents(10);
      return students.map((student) => {
        const est = student.userEstablishments?.[0]?.establishment;
        return {
          name: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
          email: student.email ?? null,
          role: UserRole.STUDENT,
          status: student.status ?? null,
          establishment: est?.name ?? null,
          activeRegistrations: 0,
        };
      });
    }

    if (user.role === UserRole.STUDENT) {
      const activeRegistrations = await this.prisma.registration.count({
        where: { studentUserId: user.userId, status: 'ACTIVE' },
      });

      return [
        {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          activeRegistrations,
        },
      ];
    }

    if (user.role === UserRole.TUTOR) {
      const students = await this.prisma.user.findMany({
        where: {
          role: UserRole.STUDENT,
          registrations: {
            some: {
              status: 'ACTIVE',
              course: { tutorUserId: user.userId },
            },
          },
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          _count: {
            select: {
              registrations: {
                where: {
                  status: 'ACTIVE',
                  course: { tutorUserId: user.userId },
                },
              },
            },
          },
        },
      });

      return students.map((student) => ({
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        role: student.role,
        activeRegistrations: student._count.registrations,
      }));
    }

    if (!isStaff(user.role)) {
      return [];
    }

    const students = await this.prisma.user.findMany({
      where: { role: UserRole.STUDENT },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        _count: {
          select: {
            registrations: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    return students.map((student) => ({
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      role: student.role,
      activeRegistrations: student._count.registrations,
    }));
  }

  formatContext(data: unknown): string {
    const rows = data as StudentSummary[];
    if (!rows.length) {
      return 'Students: no authorized student records available.';
    }

    return [
      'Students (live application excerpts):',
      ...rows.map((student, index) => {
        const parts = [
          `${index + 1}. ${student.name}`,
          student.status ? `status=${student.status}` : null,
          student.establishment ? `establishment=${student.establishment}` : null,
          `active registrations: ${student.activeRegistrations}`,
        ].filter(Boolean);
        return parts.join(' — ');
      }),
    ].join('\n');
  }
}
