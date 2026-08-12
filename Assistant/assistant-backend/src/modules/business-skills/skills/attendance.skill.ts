import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { UserAdapter } from '../../integration/adapters/user.adapter';
import { EdnovApiClient } from '../../integration/ednov-api.client';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { apiPartialFacts, displayName, safeErrorMessage } from '../skill.utils';

@Injectable()
export class AttendanceSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'attendance';
  readonly domains = [
    /\b(attendance|presence|présence|presence|absent|absences?|statistiques? d['’]assiduité|attendance statistics|who attended|qui (était|etait) présent|ont assisté)\b/i,
  ];
  readonly domainTags = ['attendance', 'presence'];
  readonly capabilities: SkillCapability[] = ['list', 'status', 'stats'];

  constructor(
    private readonly ednov: EdnovApiClient,
    private readonly academic: AcademicAdapter,
    private readonly users: UserAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      if (!isStaffRole(ctx.user.role) && ctx.user.role !== UserRole.STUDENT) {
        return {
          skillId: this.id,
          ok: false,
          operation: 'unauthorized',
          data: null,
          facts: ['Attendance data is not authorized for this role.'],
        };
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const sessionId = this.academic.resolveFocusedSessionId();
      const studentId = this.users.resolveFocusedStudentId();
      const wantsTodayAttended =
        /\b(who attended|qui (était|etait) présent|ont assisté|présents? (aujourd|today))\b/i.test(
          ctx.question,
        ) &&
        /\b(today|aujourd['’]?hui|session)\b/i.test(ctx.question);

      if (wantsTodayAttended && !sessionId && isStaffRole(ctx.user.role)) {
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const page = await this.academic.listSessionsPage({
          limit: 5,
          dateFrom: iso,
          dateTo: iso,
        });
        const first = page.sessions[0];
        if (!first?.id) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'attended_today_empty',
            data: { total: page.total },
            facts: [
              'DIRECT ANSWER: No session today, so no attendance list (API returned zero rows).',
              'SOURCE: GET /sessions?dateFrom=&dateTo=today',
            ],
          };
        }
        const participants = await this.academic.getSessionParticipants(first.id);
        return {
          skillId: this.id,
          ok: true,
          operation: 'attended_today',
          data: { session: first, participants },
          facts: [
            `DIRECT ANSWER: Attendance for today’s session “${first.title || first.name || 'session'}”.`,
            'EXPLANATION: First session of GET /sessions for today, then GET /sessions/:id/participants.',
            'SOURCE: GET /sessions + GET /sessions/:id/participants',
            'Summarize only presence fields present in the payload — do not invent rates.',
          ],
        };
      }

      if (!sessionId && !studentId && isStaffRole(ctx.user.role)) {
        try {
          const history = await this.academic.getAttendanceHistory(12);
          return {
            skillId: this.id,
            ok: true,
            operation: 'attendance_history',
            data: history,
            facts: [
              'Attendance history loaded from Ednov (authorization-scoped).',
              'Summarize only presence fields present in the payload — do not invent rates.',
              'Prefer a Markdown table of session date / status when listing.',
            ],
          };
        } catch {
          // fall through to needs_context
        }
      }

      if (sessionId) {
        try {
          const participants =
            await this.academic.getSessionParticipants(sessionId);
          return {
            skillId: this.id,
            ok: true,
            operation: 'session_attendance',
            data: { sessionId, participants },
            facts: [
              'Attendance/presence data for the focused session derived from participants payload.',
              'Only use presence fields present in the payload — do not invent attendance rates.',
            ],
          };
        } catch (error) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'session_attendance_partial',
            data: null,
            facts: apiPartialFacts('GET /sessions/:id/participants', error),
            warnings: [safeErrorMessage(error)],
          };
        }
      }

      if (studentId) {
        try {
          const detail = await this.ednov.get(`/users/students/${studentId}`);
          let studentLabel =
            ctx.applicationContext?.student?.label?.trim() || 'focused student';
          try {
            const student = await this.users.findStudentById(studentId);
            studentLabel = displayName(student);
          } catch {
            // keep label from context
          }
          return {
            skillId: this.id,
            ok: true,
            operation: 'student_attendance_profile',
            data: detail,
            facts: [
              `Student ${studentLabel} profile loaded for attendance-related fields.`,
              'Report only attendance metrics explicitly present on the student payload.',
            ],
          };
        } catch (error) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'student_attendance_partial',
            data: null,
            facts: apiPartialFacts('GET /users/students/:id', error),
            warnings: [safeErrorMessage(error)],
          };
        }
      }

      return {
        skillId: this.id,
        ok: true,
        operation: 'attendance_needs_context',
        data: null,
        facts: [
          'Attendance queries need a focused session or student (ApplicationContext).',
          'Open a session/student page or select one, then ask again.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts(this.id, error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }
}
