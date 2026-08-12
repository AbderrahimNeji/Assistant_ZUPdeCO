import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { EdnovApiClient } from '../ednov-api.client';
import { encodeEdnovId } from '../ednov-path';
import { RequestContextStore } from '../request-context';
import { AcademicAdapter } from './academic.adapter';

type SessionAssignmentLike = {
  id: string;
  status?: string;
  studentUserId?: string;
  student?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  session?: {
    id?: string;
    title?: string;
    name?: string;
  };
  program?: {
    id?: string;
    label?: string;
    name?: string;
  };
  createdAt?: string;
};

type ParticipantRow = {
  id: string;
  userId?: string;
  role?: string;
  attendanceStatus?: string | null;
  user?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
  };
};

/**
 * Session participation via GET /sessions/:id/participants.
 * This is NOT user onboarding (`user_onboarding_*`) — that module has no REST API.
 */
@Injectable()
export class RegistrationAdapter {
  constructor(
    private readonly ednov: EdnovApiClient,
    private readonly academic: AcademicAdapter,
  ) {}

  async listForUser(userId: string, role: UserRole) {
    const focusedStudent =
      RequestContextStore.getApplicationContext()?.student?.id;
    const focusedSession =
      RequestContextStore.getApplicationContext()?.session?.id;

    let sessions: Awaited<ReturnType<AcademicAdapter['listSessions']>> = [];
    if (focusedSession) {
      try {
        sessions = [await this.academic.getSession(focusedSession)];
      } catch {
        sessions = [];
      }
    } else {
      sessions = await this.academic.listSessions(20);
    }

    const rows: Array<{
      id: string;
      status: 'ACTIVE';
      role: string | null;
      attendanceStatus: string | null;
      studentUserId: string;
      sessionDate: string | null;
      course: { id: string; title: string };
      program: { id?: string; name?: string } | null;
      student?: { firstName: string | null; lastName: string | null };
    }> = [];

    for (const session of sessions as Array<{
      id: string;
      title?: string;
      name?: string;
      program?: { id?: string; label?: string; name?: string } | null;
      sessionDate?: string;
    }>) {
      if (!session?.id) continue;
      try {
        const raw = await this.ednov.get<
          ParticipantRow[] | { data?: ParticipantRow[]; items?: ParticipantRow[] }
        >(`/sessions/${encodeEdnovId(session.id)}/participants`);
        const participants = Array.isArray(raw)
          ? raw
          : raw.data ?? raw.items ?? [];

        const relevant = participants.filter((p) => {
          if (role === UserRole.ADMIN || role === UserRole.COORDINATOR) {
            if (focusedStudent) {
              return (p.userId || p.user?.id) === focusedStudent;
            }
            return true;
          }
          return (p.userId || p.user?.id) === userId;
        });

        for (const participant of relevant.slice(0, 8)) {
          rows.push({
            id: participant.id,
            status: 'ACTIVE',
            role: participant.role ?? null,
            attendanceStatus: participant.attendanceStatus ?? null,
            studentUserId: participant.userId || participant.user?.id || userId,
            sessionDate: session.sessionDate ?? null,
            course: {
              id: session.id,
              title: session.title || session.name || 'Session',
            },
            program: session.program
              ? {
                  id: session.program.id,
                  name: session.program.label || session.program.name,
                }
              : null,
            student:
              role === UserRole.ADMIN || role === UserRole.COORDINATOR
                ? {
                    firstName: participant.user?.firstName ?? null,
                    lastName: participant.user?.lastName ?? null,
                  }
                : undefined,
          });
        }
      } catch {
        // Skip sessions the user cannot access — never escalate privileges.
      }

      if (rows.length >= 20) break;
    }

    return rows.slice(0, 20);
  }

  async enrollInCourse(userId: string, role: UserRole, courseId: string) {
    if (role === UserRole.PARENT) {
      throw new ForbiddenException(
        'Parents cannot enroll themselves in courses',
      );
    }

    try {
      const course = await this.academic.findProgramOrSessionAsCourse(courseId);
      const created = await this.ednov.post<SessionAssignmentLike>(
        `/sessions/${encodeEdnovId(course.id)}/assignments`,
        { studentUserId: userId },
      );
      return {
        id: created.id,
        status: created.status ?? null,
        studentUserId: userId,
        course: { id: course.id, title: course.title },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new BadRequestException(
        'Enrollment must be completed through Ednov session matching. Open the session page and use Assign.',
      );
    }
  }

  async cancelRegistration(
    userId: string,
    role: UserRole,
    registrationId: string,
  ) {
    const isStaff = role === UserRole.ADMIN || role === UserRole.COORDINATOR;

    const sessionId =
      RequestContextStore.getApplicationContext()?.session?.id ??
      RequestContextStore.getApplicationContext()?.course?.id;

    if (!sessionId) {
      throw new BadRequestException(
        'Open a session in Ednov to cancel a registration from the Copilot.',
      );
    }

    try {
      await this.ednov.delete(
        `/sessions/${encodeEdnovId(sessionId)}/participants/${encodeEdnovId(registrationId)}`,
      );
    } catch (error) {
      if (!isStaff && !(error instanceof ForbiddenException)) {
        throw new ForbiddenException(
          'You can only cancel your own registrations',
        );
      }
      throw error;
    }

    return {
      id: registrationId,
      status: 'CANCELLED',
      studentUserId: userId,
      course: { title: 'Session' },
      program: null,
    };
  }

  async getRegistration(registrationId: string) {
    throw new NotFoundException(
      `Registration ${registrationId} is managed by Ednov sessions. There is no GET /registrations/:id endpoint.`,
    );
  }
}
