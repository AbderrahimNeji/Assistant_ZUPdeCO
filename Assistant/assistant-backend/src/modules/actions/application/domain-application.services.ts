import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import type { CreateSessionInput } from '../../integration/adapters/academic.adapter';
import { CalendarAdapter } from '../../integration/adapters/calendar.adapter';
import { MatchingAdapter } from '../../integration/adapters/matching.adapter';
import { NotificationAdapter } from '../../integration/adapters/notification.adapter';
import { RegistrationAdapter } from '../../integration/adapters/registration.adapter';
import { UserAdapter } from '../../integration/adapters/user.adapter';
import { isEdnovDataSource, RequestContextStore } from '../../integration/request-context';
import { mapEdnovRolesToUserRole, extractEdnovRoleCodes } from '../../integration/role-mapper';
import { assertAccessible } from '../../../common/security/assert-accessible';

/**
 * Application services consumed by tools/workflows.
 * Method signatures are stable — implementations switch to Ednov adapters
 * when APPLICATION_DATA_SOURCE=ednov or AUTH_MODE=firebase.
 */
@Injectable()
export class CourseApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly academic: AcademicAdapter,
  ) {}

  async listPublished(limit = 12) {
    if (isEdnovDataSource()) {
      return this.academic.listProgramsAsCourses(limit);
    }

    return this.prisma.course.findMany({
      where: { isPublished: true },
      take: limit,
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        subject: true,
        level: true,
        description: true,
        tutor: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findPublishedByName(name: string) {
    if (isEdnovDataSource()) {
      return this.academic.findProgramsByName(name);
    }

    const query = name.trim();
    if (!query) return [];

    return this.prisma.course.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { subject: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 8,
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        subject: true,
        level: true,
        description: true,
      },
    });
  }

  async findPublishedById(courseId: string) {
    if (isEdnovDataSource()) {
      return this.academic.findProgramOrSessionAsCourse(courseId);
    }

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isPublished: true },
      select: {
        id: true,
        title: true,
        subject: true,
        level: true,
        description: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }
}

@Injectable()
export class RegistrationApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registrations: RegistrationAdapter,
  ) {}

  async listForUser(userId: string, role: UserRole) {
    if (isEdnovDataSource()) {
      return this.registrations.listForUser(userId, role);
    }

    if (role === UserRole.ADMIN || role === UserRole.COORDINATOR) {
      return this.prisma.registration.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { id: true, title: true } },
          program: { select: { id: true, name: true } },
          student: { select: { firstName: true, lastName: true } },
        },
      });
    }

    return this.prisma.registration.findMany({
      where: { studentUserId: userId },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
        program: { select: { id: true, name: true } },
      },
    });
  }

  async enrollInCourse(userId: string, role: UserRole, courseId: string) {
    if (isEdnovDataSource()) {
      return this.registrations.enrollInCourse(userId, role, courseId);
    }

    if (role === UserRole.PARENT) {
      throw new ForbiddenException(
        'Parents cannot enroll themselves in courses',
      );
    }

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, isPublished: true },
      select: { id: true, title: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found or not published');
    }

    const existing = await this.prisma.registration.findFirst({
      where: {
        studentUserId: userId,
        courseId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `You are already enrolled in "${course.title}"`,
      );
    }

    return this.prisma.registration.create({
      data: {
        studentUserId: userId,
        courseId,
        status: 'ACTIVE',
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
  }

  async cancelRegistration(
    userId: string,
    role: UserRole,
    registrationId: string,
  ) {
    if (isEdnovDataSource()) {
      return this.registrations.cancelRegistration(userId, role, registrationId);
    }

    const registration = await this.prisma.registration.findFirst({
      where: { id: registrationId },
      include: {
        course: { select: { title: true } },
        program: { select: { name: true } },
      },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    const isOwner = registration.studentUserId === userId;
    const isStaff = role === UserRole.ADMIN || role === UserRole.COORDINATOR;

    if (!isOwner && !isStaff) {
      throw new ForbiddenException(
        'You can only cancel your own registrations',
      );
    }

    if (registration.status === 'CANCELLED') {
      throw new BadRequestException('Registration is already cancelled');
    }

    return this.prisma.registration.update({
      where: { id: registrationId },
      data: { status: 'CANCELLED' },
      include: {
        course: { select: { title: true } },
        program: { select: { name: true } },
      },
    });
  }
}

@Injectable()
export class ProfileApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserAdapter,
  ) {}

  async getOwn(userId: string) {
    if (isEdnovDataSource()) {
      const me = await this.users.getMe();
      const role = mapEdnovRolesToUserRole(extractEdnovRoleCodes(me));
      return this.users.toProfileShape(me, role);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateOwn(
    userId: string,
    data: { firstName?: string; lastName?: string },
  ) {
    if (isEdnovDataSource()) {
      const updated = await this.users.updateMe(data);
      const role = mapEdnovRolesToUserRole(extractEdnovRoleCodes(updated));
      return this.users.toProfileShape(updated, role);
    }

    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();

    if (!firstName && !lastName) {
      throw new BadRequestException('No profile fields to update');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });
  }
}

@Injectable()
export class TutorApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UserAdapter,
  ) {}

  async listTutors(limit = 10) {
    if (isEdnovDataSource()) {
      return this.users.listTutors(limit);
    }

    return this.prisma.user.findMany({
      where: { role: UserRole.TUTOR },
      take: limit,
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        coursesTaught: {
          where: { isPublished: true },
          select: { id: true, title: true, subject: true },
          take: 5,
        },
      },
    });
  }

  async findByName(name: string) {
    if (isEdnovDataSource()) {
      return this.users.findTutorsByName(name);
    }

    const query = name.trim();
    if (!query) return [];

    return this.prisma.user.findMany({
      where: {
        role: UserRole.TUTOR,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 8,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        coursesTaught: {
          where: { isPublished: true },
          select: { title: true, subject: true },
          take: 5,
        },
      },
    });
  }
}

@Injectable()
export class CalendarApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarAdapter,
  ) {}

  async getTimetable(userId: string) {
    if (isEdnovDataSource()) {
      return this.calendar.getTimetable(userId);
    }

    const registrations = await this.prisma.registration.findMany({
      where: {
        studentUserId: userId,
        status: 'ACTIVE',
        courseId: { not: null },
      },
      include: {
        course: {
          select: {
            title: true,
            subject: true,
            level: true,
            tutor: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return registrations
      .filter((row) => row.course)
      .map((row, index) => {
        const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][index % 5];
        const hour = 16 + (index % 3);
        return {
          weekday,
          time: `${hour}:00–${hour + 1}:00`,
          course: row.course!.title,
          subject: row.course!.subject,
          tutor: row.course!.tutor
            ? `${row.course!.tutor.firstName} ${row.course!.tutor.lastName}`
            : null,
        };
      });
  }
}

@Injectable()
export class SessionApplicationService {
  constructor(
    private readonly academic: AcademicAdapter,
    private readonly users: UserAdapter,
  ) {}

  async createSession(dto: CreateSessionInput) {
    if (!isEdnovDataSource()) {
      throw new BadRequestException(
        'La création de séances Ednov nécessite AUTH_MODE=firebase / APPLICATION_DATA_SOURCE=ednov.',
      );
    }
    await assertAccessible(() =>
      this.academic.getEstablishment(dto.establishmentId),
    );
    if (dto.programId) {
      await assertAccessible(() =>
        this.academic.findProgramOrSessionAsCourse(dto.programId!),
      );
    }
    for (const studentId of dto.studentIds ?? []) {
      await assertAccessible(() => this.users.findStudentById(studentId));
    }
    for (const tutorId of dto.tutorIds ?? []) {
      await assertAccessible(() => this.users.findTutorById(tutorId));
    }
    return this.academic.createSession(dto);
  }

  async cancelSession(
    sessionId: string,
    body: { reasonCode: string; reasonDetail?: string },
  ) {
    if (!isEdnovDataSource()) {
      throw new BadRequestException(
        'L’annulation de séances Ednov nécessite AUTH_MODE=firebase / APPLICATION_DATA_SOURCE=ednov.',
      );
    }
    await assertAccessible(() => this.academic.getSession(sessionId));
    return this.academic.cancelSession(sessionId, {
      ...body,
      dematchMode: 'GLOBAL',
    });
  }

  async getFocusedSession() {
    const id = this.academic.resolveFocusedSessionId();
    if (!id) return null;
    try {
      const session = await this.academic.getSession(id);
      return { id, session };
    } catch {
      return { id, session: null };
    }
  }

  async listEstablishments(limit = 8, search?: string) {
    if (!isEdnovDataSource()) return [];
    return this.academic.listEstablishments(limit, search);
  }

  async listSubjects(limit = 8, search?: string) {
    if (!isEdnovDataSource()) return [];
    return this.academic.listSubjects(limit, search);
  }

  resolveDefaults() {
    return {
      establishmentId: this.academic.resolveFocusedEstablishmentId(),
      programId: this.academic.resolveFocusedProgramId(),
    };
  }

  resolveFocusedSessionId() {
    return this.academic.resolveFocusedSessionId();
  }
}

@Injectable()
export class MatchingApplicationService {
  constructor(
    private readonly matching: MatchingAdapter,
    private readonly academic: AcademicAdapter,
    private readonly users: UserAdapter,
  ) {}

  async setAssignments(
    sessionId: string,
    pairs: Array<{ studentUserId: string; tutorUserId: string }>,
  ) {
    if (!isEdnovDataSource()) {
      throw new BadRequestException(
        'Matching Ednov nécessite AUTH_MODE=firebase / APPLICATION_DATA_SOURCE=ednov.',
      );
    }
    await assertAccessible(() => this.academic.getSession(sessionId));
    for (const pair of pairs) {
      await assertAccessible(() => this.users.findStudentById(pair.studentUserId));
      await assertAccessible(() => this.users.findTutorById(pair.tutorUserId));
    }
    return this.matching.setAssignments(sessionId, { pairs });
  }

  resolveSessionId() {
    return this.academic.resolveFocusedSessionId();
  }

  resolveStudentId() {
    return (
      this.users.resolveFocusedStudentId() ||
      this.matching.resolveContextStudentId()
    );
  }

  resolveTutorId() {
    return (
      this.users.resolveFocusedTutorId() ||
      this.matching.resolveContextTutorId()
    );
  }
}

@Injectable()
export class ReportApplicationService {
  constructor(private readonly academic: AcademicAdapter) {}

  async createDraftReport(sessionId: string, authorId: string) {
    if (!isEdnovDataSource()) {
      throw new BadRequestException(
        'La création de comptes-rendus Ednov nécessite AUTH_MODE=firebase / APPLICATION_DATA_SOURCE=ednov.',
      );
    }
    await assertAccessible(() => this.academic.getSession(sessionId));
    const signedAuthorId =
      RequestContextStore.getStore()?.ednovUserId?.trim() || authorId;
    return this.academic.createSessionReport(sessionId, {
      authorId: signedAuthorId,
      status: 'to_complete',
    });
  }

  async validateReport(sessionId: string, reportId: string) {
    if (!isEdnovDataSource()) {
      throw new BadRequestException(
        'La validation de comptes-rendus Ednov nécessite AUTH_MODE=firebase / APPLICATION_DATA_SOURCE=ednov.',
      );
    }
    await assertAccessible(() => this.academic.getSession(sessionId));
    await assertAccessible(() =>
      this.academic.getSessionReport(sessionId, reportId),
    );
    return this.academic.validateSessionReport(sessionId, reportId);
  }

  resolveSessionId() {
    return this.academic.resolveFocusedSessionId();
  }

  resolveReportId() {
    return this.academic.resolveFocusedReportId();
  }
}

@Injectable()
export class NotificationApplicationService {
  constructor(private readonly notifications: NotificationAdapter) {}

  async listForUser(userId: string) {
    if (isEdnovDataSource()) {
      return this.notifications.listForUser(userId);
    }

    return {
      userId,
      items: [] as Array<{ id: string; title: string; body: string }>,
      hint: 'You have no new notifications right now.',
    };
  }

  async markAllRead() {
    if (!isEdnovDataSource()) {
      throw new BadRequestException(
        'Les notifications Ednov nécessitent AUTH_MODE=firebase / APPLICATION_DATA_SOURCE=ednov.',
      );
    }
    return this.notifications.markAllRead();
  }
}
