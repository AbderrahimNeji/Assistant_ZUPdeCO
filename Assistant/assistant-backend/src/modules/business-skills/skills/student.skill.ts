import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { DashboardAdapter } from '../../integration/adapters/dashboard.adapter';
import { MatchingAdapter } from '../../integration/adapters/matching.adapter';
import {
  EdnovUserRow,
  UserAdapter,
} from '../../integration/adapters/user.adapter';
import { EdnovApiClient } from '../../integration/ednov-api.client';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import {
  answerFacts,
  apiPartialFacts,
  asksOpenOrShowProfile,
  displayName,
  extractPersonName,
  safeErrorMessage,
} from '../skill.utils';
import {
  ambiguousEntityFacts,
  collectWarnings,
  logFallback,
  recallProfile,
  rememberProfile,
  softCall,
} from '../skill-resilience';

const UNAVAILABLE =
  'This information is currently unavailable because the backend does not expose it.';

const STATUS_LABEL: Record<string, string> = {
  registered: 'registered (Inscrit)',
  accompanied: 'accompanied (Accompagné)',
  deactivated: 'deactivated (Désactivé)',
};

/**
 * Students module live facts — status counts, search, lists, focused profile /
 * diagnostics. Uses Ednov /users/students (+ status-history, Matching pairs,
 * reports when present). Never invents statuses or lists.
 */
@Injectable()
export class StudentSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'student';
  readonly domains = [
    /\b(student|students|élève|eleve|élèves|eleves|learner|learners)\b/i,
    /\b(inscrits?|accompagnés?|accompagnes?|désactivés?|desactives?|onboarding)\b/i,
    /\b(élèves? actifs?|eleves? actifs?|active students?|inactive students?|élèves? inactifs?)\b/i,
    /\b(open|ouvre|ouvrir|show|montre|affiche).{0,40}(student|élève|eleve|profil|profile|fiche)\b/i,
    /\b(open|ouvre|ouvrir)\s+[A-ZÀ-Ÿ]/u,
  ];
  readonly domainTags = [
    'student',
    'learners',
    'onboarding',
    'student-status',
    'student-attention',
  ];
  readonly capabilities: SkillCapability[] = [
    'count',
    'search',
    'list',
    'status',
  ];

  constructor(
    private readonly users: UserAdapter,
    private readonly dashboard: DashboardAdapter,
    private readonly matching: MatchingAdapter,
    private readonly academic: AcademicAdapter,
    private readonly ednov: EdnovApiClient,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      if (ctx.user.role === UserRole.STUDENT) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'self_profile',
          data: {
            id: ctx.user.userId,
            name: `${ctx.user.firstName} ${ctx.user.lastName}`.trim(),
            email: ctx.user.email,
          },
          facts: [
            `Authenticated student: ${ctx.user.firstName} ${ctx.user.lastName}.`,
            'Student role may only access own information.',
          ],
        };
      }

      if (!isStaffRole(ctx.user.role)) {
        return {
          skillId: this.id,
          ok: false,
          operation: 'unauthorized',
          data: null,
          facts: ['No student data authorized for this role.'],
        };
      }

      const q = ctx.question;
      const focusedId =
        this.users.resolveFocusedStudentId() ||
        this.matching.resolveContextStudentId();
      const labelHint =
        ctx.applicationContext?.student?.label?.trim() ||
        ctx.applicationContext?.selection?.primary?.label?.trim();
      const search = extractStudentSearch(q);

      if (wantsStudentProfile(q, Boolean(focusedId), search)) {
        return this.openStudentProfile(q, focusedId, labelHint, search);
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const establishmentId =
        this.users.resolveEstablishmentFilterId() ||
        this.academic.resolveFocusedEstablishmentId();

      if (asksCount(q) && !asksRegisteredToday(q)) {
        return this.countStudents(q, establishmentId);
      }

      if (asksRegisteredToday(q)) {
        return this.listRegisteredToday(establishmentId, q);
      }

      if (asksJoinedThisMonth(q)) {
        return this.listJoinedThisMonth(establishmentId, q);
      }

      if (asksByProgram(q)) {
        return unavailableResult(
          this.id,
          'list_by_program_unavailable',
          [
            'Students by program: ' + UNAVAILABLE,
            'GET /users/students has no programId filter.',
            'Next action: open Students and filter by establishment / level / class, or open Programs.',
          ],
        );
      }

      if (asksAbsentThisWeek(q)) {
        return unavailableResult(
          this.id,
          'absent_this_week_unavailable',
          [
            'Students absent this week: ' + UNAVAILABLE,
            'No company-wide “absent this week” student list endpoint is exposed to Copilot.',
            'Attendance history / session participants can be used when a session is focused (AttendanceSkill).',
            'Next action: open Attendance or a session, then ask who was absent.',
          ],
        );
      }

      if (asksMissingReports(q) && !focusedId) {
        return this.studentsMissingReports();
      }

      if (asksWithoutSessions(q) || asksNoSessionOver30(q)) {
        return this.studentsSessionGap(q);
      }

      if (asksWithoutTutor(q) || asksNoActiveMatching(q)) {
        return this.studentsWithoutTutor(q);
      }

      if (asksRequiringAttention(q)) {
        return this.studentsRequiringAttention(establishmentId);
      }

      if (asksByEstablishment(q) || establishmentId) {
        if (asksByEstablishment(q) || (establishmentId && asksList(q))) {
          return this.listByEstablishment(establishmentId, q);
        }
      }

      if (asksStatusList(q)) {
        return this.listByStatus(q, establishmentId);
      }

      if (
        search &&
        (asksSearch(q) ||
          /\b(all|tous?)\b/i.test(q) ||
          /\b(mohamed|ben)\b/i.test(search))
      ) {
        return this.searchStudents(search);
      }

      if (focusedId && asksDiagnostic(q)) {
        return this.diagnoseStudent({
          studentId: focusedId,
          labelHint,
          question: q,
        });
      }

      if (focusedId && (asksTimeline(q) || asksProfile(q) || asksDeixis(q))) {
        return this.focusedStudentDetail(focusedId, labelHint, q);
      }

      if (
        focusedId &&
        /\b(this student|cet élève|cet eleve|cette élève|cette eleve|this learner|selected student)\b/i.test(
          q,
        )
      ) {
        return this.focusedStudentDetail(focusedId, labelHint, q);
      }

      if (search) {
        return this.searchStudents(search);
      }

      if (focusedId) {
        return this.focusedStudentDetail(focusedId, labelHint, q);
      }

      const page = await this.users.listStudentsPage({ limit: 15 });
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_students',
        data: { total: page.total, sample: page.students.map(summarizeStudent) },
        facts: [
          `Students (sample of ${page.students.length}` +
            (page.total != null ? `, API total ${page.total}` : '') +
            ', authorization-scoped):',
          '| # | Student | Status | Establishment |',
          '| ---: | --- | --- | --- |',
          ...page.students.map(
            (s, i) =>
              `| ${i + 1} | ${displayName(s)} | ${statusLabel(s.status)} | ${establishmentLabel(s)} |`,
          ),
          'Ask for counts by status, search by name, without tutors, or open a student profile for diagnostics.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts('Students', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async listRegisteredToday(
    establishmentId: string | undefined,
    q: string,
  ): Promise<SkillResult> {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    try {
      const page = await this.users.listStudentsPage({
        limit: 20,
        dateFrom: iso,
        dateTo: iso,
        ...(establishmentId ? { establishmentId } : {}),
      });
      const countOnly = /\b(how many|combien|count|nombre)\b/i.test(q);
      return {
        skillId: this.id,
        ok: true,
        operation: 'students_registered_today',
        data: { date: iso, total: page.total, sample: page.students.map(summarizeStudent) },
        facts: [
          `Students registered today (${iso}) via GET /users/students?dateFrom=&dateTo= (filter on createdAt).`,
          page.total != null
            ? `API total: ${page.total}. Showing ${page.students.length}.`
            : `Showing ${page.students.length} (API total unavailable).`,
          ...(countOnly
            ? []
            : [
                '',
                '| # | Student | Status | Establishment |',
                '| ---: | --- | --- | --- |',
                ...(page.students.length
                  ? page.students.map(
                      (s, i) =>
                        `| ${i + 1} | ${displayName(s)} | ${statusLabel(s.status)} | ${establishmentLabel(s)} |`,
                    )
                  : ['| — | (none) | — | — |']),
              ]),
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'students_registered_today_partial',
        data: null,
        facts: apiPartialFacts('GET /users/students', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async listJoinedThisMonth(
    establishmentId: string | undefined,
    q: string,
  ): Promise<SkillResult> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const dateFrom = `${y}-${m}-01`;
    const dateTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    const page = await this.users.listStudentsPage({
      limit: 20,
      dateFrom,
      dateTo,
      ...(establishmentId ? { establishmentId } : {}),
    });
    const countOnly = /\b(how many|combien|count|nombre)\b/i.test(q);
    return {
      skillId: this.id,
      ok: true,
      operation: 'students_joined_this_month',
      data: {
        dateFrom,
        dateTo,
        total: page.total,
        sample: page.students.map(summarizeStudent),
      },
      facts: [
        `DIRECT ANSWER: ${page.total ?? page.students.length} student(s) created this month (${dateFrom} → ${dateTo}).`,
        'EXPLANATION: GET /users/students?dateFrom=&dateTo= filters on createdAt (join/registration proxy).',
        'NEXT ACTION: open Students and filter by date.',
        'SOURCE: GET /users/students',
        ...(countOnly
          ? []
          : [
              '',
              '| # | Student | Status | Establishment |',
              '| ---: | --- | --- | --- |',
              ...(page.students.length
                ? page.students.map(
                    (s, i) =>
                      `| ${i + 1} | ${displayName(s)} | ${statusLabel(s.status)} | ${establishmentLabel(s)} |`,
                  )
                : ['| — | (none) | — | — |']),
            ]),
      ],
    };
  }

  private async studentsMissingReports(): Promise<SkillResult> {
    try {
      const [page, kpis] = await Promise.all([
        this.academic.listReportsPage(20, {
          statuses: ['to_complete', 'draft', 'overdue'],
        }),
        this.academic.getReportKpis().catch(() => null),
      ]);
      const missingKpi =
        kpis && typeof kpis === 'object'
          ? (kpis as Record<string, unknown>).missingReports ??
            (kpis as Record<string, unknown>).pendingReports
          : null;
      return {
        skillId: this.id,
        ok: true,
        operation: 'students_without_reports_proxy',
        data: { incomplete: page.items, total: page.total, kpis },
        facts: [
          'Students without reports — live proxy from GET /sessions/reports (to_complete, draft, overdue) + GET /sessions/report-kpis.',
          missingKpi != null
            ? `missingReports / pendingReports KPI: ${String(missingKpi)}.`
            : 'missingReports KPI: unavailable on this payload.',
          page.total != null
            ? `Incomplete report rows (API total): ${page.total}. Showing ${page.items.length}.`
            : `Incomplete report rows shown: ${page.items.length}.`,
          '',
          '| # | Session | Status | Author |',
          '| ---: | --- | --- | --- |',
          ...(page.items.length
            ? page.items.map(
                (r, i) =>
                  `| ${i + 1} | ${r.sessionDisplayName || r.sessionId || 'Session'} | ${r.status ?? '—'} | ${r.authorName || '—'} |`,
              )
            : ['| — | (none) | — | — |']),
          '',
          'Named student census for completed sessions with zero report row: not exposed as a dedicated students-with-missing-reports endpoint — use the KPI + incomplete rows above; do not invent names.',
          'Next action: open Comptes-rendus (à saisir / overdue), or name a student for their reports.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'students_without_reports_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/reports', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async countStudents(
    q: string,
    establishmentId?: string,
  ): Promise<SkillResult> {
    const wantsRegistered =
      /\b(registered|inscrits?|onboarding|waiting|attente)\b/i.test(q);
    const wantsActive =
      /\b(active|actifs?|accompanied|accompagnés?|accompagnes?)\b/i.test(q);
    const wantsInactive =
      /\b(inactive|inactifs?|archived|archivés?|archives?|deactivated|désactivés?|desactives?)\b/i.test(
        q,
      );
    const wantsWaiting =
      /\b(waiting|attente|onboarding)\b/i.test(q);

    try {
      const [registered, accompanied, deactivated, dash] = await Promise.all([
        this.users.countStudents(['registered']),
        this.users.countStudents(['accompanied']),
        this.users.countStudents(['deactivated']),
        this.dashboard.getStats().catch(() => null),
      ]);
      const kpis = dash ? this.dashboard.extractStudentKpis(dash) : null;
      const total = await this.users.countStudents();

      const facts: string[] = [
        'Student counts (live, authorization-scoped via GET /users/students statuses):',
        `| Metric | Count | Ednov status |`,
        `| --- | ---: | --- |`,
        `| Registered / Inscrit | ${registered} | registered |`,
        `| Active accompaniment | ${accompanied} | accompanied |`,
        `| Inactive / archived | ${deactivated} | deactivated |`,
        `| All students (API total) | ${total} | (no status filter) |`,
      ];

      if (kpis?.registeredLikeActive != null || kpis?.accompanied != null) {
        facts.push(
          'Dashboard KPIs (when available — note: `stat-students-active` = registered/Inscrit, not accompanied):',
        );
        if (kpis.registeredLikeActive != null) {
          facts.push(
            `- Dashboard “students active” (registered): ${kpis.registeredLikeActive}.`,
          );
        }
        if (kpis.accompanied != null) {
          facts.push(
            `- Dashboard accompanied: ${kpis.accompanied}.`,
          );
        }
        if (kpis.newStudents != null) {
          facts.push(`- Dashboard new students: ${kpis.newStudents}.`);
        }
      }

      if (wantsWaiting || wantsRegistered) {
        facts.push(
          `Waiting onboarding (mapped to status registered / Inscrit): ${registered}.`,
        );
        facts.push(
          'Pending email activation (`pendingActivation`) is only on student detail payloads — not a list/count filter. ' +
            UNAVAILABLE +
            ' for a dedicated “waiting activation” census.',
        );
      }
      if (wantsActive) {
        facts.push(
          `Active students in Ednov account model = status accompanied: ${accompanied}.`,
        );
      }
      if (wantsInactive) {
        facts.push(
          `Inactive / archived students = status deactivated: ${deactivated}.`,
        );
      }
      if (establishmentId) {
        const estPage = await this.users.listStudentsPage({
          limit: 1,
          establishmentId,
        });
        facts.push(
          estPage.total != null
            ? `Focused establishment filter: ${estPage.total} student(s) (authorization-scoped).`
            : 'Focused establishment filter applied; API total unavailable on this response.',
        );
      }
      facts.push(
        'Next action: list students by status, open Students filters, or select a student for diagnosis.',
      );

      return {
        skillId: this.id,
        ok: true,
        operation: 'count_students_by_status',
        data: {
          registered,
          accompanied,
          deactivated,
          total,
          dashboard: kpis
            ? {
                registeredLikeActive: kpis.registeredLikeActive,
                accompanied: kpis.accompanied,
                newStudents: kpis.newStudents,
              }
            : null,
        },
        facts,
      };
    } catch (error) {
      const count = await this.users.countStudents().catch(() => null);
      return {
        skillId: this.id,
        ok: count != null,
        operation: 'count_students_fallback',
        data: { count },
        facts:
          count != null
            ? [`Registered students count (live total only): ${count}.`]
            : ['Could not load student counts from Ednov.'],
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async searchStudents(name: string): Promise<SkillResult> {
    const hits = await this.users.searchStudents(name, 12);
    return {
      skillId: this.id,
      ok: true,
      operation: 'search_students',
      data: hits.map(summarizeStudent),
      facts: hits.length
        ? [
            `Found ${hits.length} student(s) matching “${name}” (live search):`,
            '| # | Student | Status | Establishment |',
            '| ---: | --- | --- | --- |',
            ...hits.map(
              (s, i) =>
                `| ${i + 1} | ${displayName(s)} | ${statusLabel(s.status)} | ${establishmentLabel(s)} |`,
            ),
            'Next action: Open student profile or ask about matching / reports for a selected student.',
          ]
        : [`No students found matching “${name}”.`],
    };
  }

  private async listByStatus(
    q: string,
    establishmentId?: string,
  ): Promise<SkillResult> {
    let statuses: string[] = [];
    if (/\b(deactivated|désactiv|desactiv|inactive|archiv)/i.test(q)) {
      statuses = ['deactivated'];
    } else if (/\b(accompanied|accompagn|active|actifs?)\b/i.test(q)) {
      statuses = ['accompanied'];
    } else if (/\b(registered|inscrit|onboarding|waiting|attente)\b/i.test(q)) {
      statuses = ['registered'];
    } else {
      statuses = ['registered', 'accompanied', 'deactivated'];
    }

    const page = await this.users.listStudentsPage({
      limit: 20,
      statuses,
      ...(establishmentId ? { establishmentId } : {}),
    });
    return {
      skillId: this.id,
      ok: true,
      operation: 'list_by_status',
      data: {
        statuses,
        total: page.total,
        students: page.students.map(summarizeStudent),
      },
      facts: [
        `Students with status ${statuses.map((s) => statusLabel(s)).join(', ')}` +
          (page.total != null ? ` (API total ${page.total})` : '') +
          ':',
        '| # | Student | Status | Establishment |',
        '| ---: | --- | --- | --- |',
        ...page.students.map(
          (s, i) =>
            `| ${i + 1} | ${displayName(s)} | ${statusLabel(s.status)} | ${establishmentLabel(s)} |`,
        ),
        page.students.length
          ? 'Next action: Open student profile or diagnose onboarding / matching.'
          : 'No students in this status filter.',
      ],
    };
  }

  private async listByEstablishment(
    establishmentId: string | undefined,
    q: string,
  ): Promise<SkillResult> {
    if (!establishmentId) {
      return unavailableResult(this.id, 'list_by_establishment_needs_context', [
        'Students by establishment need a focused establishment (ApplicationContext filter or selection).',
        'Open Establishments or set the Students establishment filter, then ask again.',
        'Listing every establishment breakdown in one call: ' + UNAVAILABLE,
      ]);
    }

    const page = await this.users.listStudentsPage({
      limit: 20,
      establishmentId,
      ...(asksStatusList(q)
        ? {
            statuses: /\b(deactivated|inactive|archiv)/i.test(q)
              ? ['deactivated']
              : /\b(accompanied|active)/i.test(q)
                ? ['accompanied']
                : /\b(registered|inscrit|waiting)/i.test(q)
                  ? ['registered']
                  : undefined,
          }
        : {}),
    });
    const estLabel =
      page.students[0] != null
        ? establishmentLabel(page.students[0])
        : 'focused establishment';

    return {
      skillId: this.id,
      ok: true,
      operation: 'list_by_establishment',
      data: { establishmentId: '[redacted]', total: page.total, sample: page.students.map(summarizeStudent) },
      facts: [
        `Students for establishment “${estLabel}”` +
          (page.total != null ? ` (API total ${page.total})` : '') +
          ':',
        '| # | Student | Status |',
        '| ---: | --- | --- |',
        ...page.students.map(
          (s, i) =>
            `| ${i + 1} | ${displayName(s)} | ${statusLabel(s.status)} |`,
        ),
        'Next action: Open student profile or filter further by status.',
      ],
    };
  }

  private async studentsWithoutTutor(q: string): Promise<SkillResult> {
    try {
      const [students, pairsPage] = await Promise.all([
        this.users.listStudents(50),
        this.matching.listPairsPage({ page: 1, pageSize: 100 }),
      ]);
      const matched = new Set(
        pairsPage.pairs
          .map((p) => p.studentUserId || p.student?.id)
          .filter(Boolean) as string[],
      );
      const unmatched = students.filter((s) => s.id && !matched.has(s.id));
      const wantsActiveMatching = asksNoActiveMatching(q);

      return {
        skillId: this.id,
        ok: true,
        operation: wantsActiveMatching
          ? 'students_no_active_matching_sample'
          : 'students_without_tutor_sample',
        data: {
          unmatchedCount: unmatched.length,
          studentsSample: students.length,
          pairsSample: pairsPage.pairs.length,
          pairsTotal: pairsPage.total,
        },
        facts: [
          wantsActiveMatching
            ? `Students with no pair in the live Matching sample: ${unmatched.length} of ${students.length} listed students` +
              (pairsPage.total != null
                ? ` (pair API total ${pairsPage.total}).`
                : '.')
            : `Students without a tutor (no pair in Matching sample): ${unmatched.length} of ${students.length}` +
              (pairsPage.total != null
                ? ` (pair API total ${pairsPage.total}).`
                : '.'),
          'This is an authorization-scoped sample, not a guaranteed full-company census.',
          'There is no separate “active matching” boolean on student records — absence of a pair row is the live signal.',
          unmatched.length ? '| Student | Status | Note |' : 'No unmatched students in this sample.',
          unmatched.length ? '| --- | --- | --- |' : '',
          ...unmatched
            .slice(0, 20)
            .map(
              (s) =>
                `| ${displayName(s)} | ${statusLabel(s.status)} | no pair in sample |`,
            ),
          'Next action: Assign tutor (Matching) or Open student profile.',
        ].filter(Boolean),
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'students_without_tutor_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/student-tutor-pairs', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async studentsSessionGap(q: string): Promise<SkillResult> {
    const wants30 = asksNoSessionOver30(q);
    try {
      const pairsPage = await this.matching.listPairsPage({
        page: 1,
        pageSize: 100,
      });
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      const rows: Array<{ label: string; last: string | null; days: number | null }> =
        [];
      for (const pair of pairsPage.pairs) {
        const label =
          displayName(pair.student ?? {}) ||
          'Student';
        const lastRaw =
          pair.lastSession?.sessionDate ??
          pair.session?.sessionDate ??
          null;
        const last = formatDate(lastRaw);
        let days: number | null = null;
        if (lastRaw) {
          const t = new Date(lastRaw).getTime();
          if (!Number.isNaN(t)) days = Math.floor((now - t) / dayMs);
        }
        rows.push({ label, last, days });
      }

      const over30 = rows.filter((r) => r.days != null && r.days > 30);
      const missingLast = rows.filter((r) => r.last == null);

      if (wants30) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'no_session_over_30_from_pairs',
          data: {
            samplePairs: pairsPage.pairs.length,
            over30: over30.length,
            missingLastSession: missingLast.length,
          },
          facts: [
            `No session > 30 days — derived from Matching pair lastSession/sessionDate on a sample of ${pairsPage.pairs.length} pairs` +
              (pairsPage.total != null ? ` (API total ${pairsPage.total})` : '') +
              '.',
            `Pairs with last session older than 30 days: ${over30.length}.`,
            missingLast.length
              ? `Pairs with no lastSession/sessionDate on payload: ${missingLast.length} (cannot compute gap).`
              : '',
            'A company-wide “students with no session ever” list is not exposed: ' +
              UNAVAILABLE,
            over30.length ? '| Student | Last session | Days since |' : 'No pairs in sample exceed 30 days since last session.',
            over30.length ? '| --- | --- | ---: |' : '',
            ...over30
              .slice(0, 20)
              .map((r) => `| ${r.label} | ${r.last ?? '—'} | ${r.days ?? '—'} |`),
            'Next action: Schedule session or Open student profile.',
          ].filter(Boolean),
        };
      }

      return {
        skillId: this.id,
        ok: true,
        operation: 'without_sessions_partial',
        data: { samplePairs: pairsPage.pairs.length },
        facts: [
          'Students without any session (full census): ' + UNAVAILABLE,
          'GET /sessions has no studentId filter; student detail has no sessions collection endpoint for Copilot.',
          `Matching pairs sample (${pairsPage.pairs.length}) can show lastSession when present — use “no session > 30 days” for that derived view.`,
          'Next action: Open Matching / Sessions or select a student for timeline.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'session_gap_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/student-tutor-pairs', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async studentsRequiringAttention(
    establishmentId?: string,
  ): Promise<SkillResult> {
    const [registered, deactivated] = await Promise.all([
      this.users.listStudentsPage({
        limit: 15,
        statuses: ['registered'],
        ...(establishmentId ? { establishmentId } : {}),
      }),
      this.users.listStudentsPage({
        limit: 10,
        statuses: ['deactivated'],
        ...(establishmentId ? { establishmentId } : {}),
      }),
    ]);

    let unmatchedNote = '';
    try {
      const [students, pairsPage] = await Promise.all([
        this.users.listStudents(30),
        this.matching.listPairsPage({ page: 1, pageSize: 80 }),
      ]);
      const matched = new Set(
        pairsPage.pairs
          .map((p) => p.studentUserId || p.student?.id)
          .filter(Boolean) as string[],
      );
      const unmatched = students.filter((s) => s.id && !matched.has(s.id));
      unmatchedNote = `Unmatched in Matching sample: ${unmatched.length} of ${students.length} students.`;
    } catch {
      unmatchedNote =
        'Unmatched student sample: unavailable (Matching pairs not loaded).';
    }

    return {
      skillId: this.id,
      ok: true,
      operation: 'students_requiring_attention',
      data: {
        registeredTotal: registered.total,
        deactivatedTotal: deactivated.total,
      },
      facts: [
        'Students requiring attention (live heuristics — not a dedicated API):',
        `- Registered / waiting accompaniment: ${registered.total ?? registered.students.length}` +
          (registered.total != null ? ' (API total).' : ' (sample).'),
        `- Deactivated: ${deactivated.total ?? deactivated.students.length}` +
          (deactivated.total != null ? ' (API total).' : ' (sample).'),
        unmatchedNote,
        'Missing-report and absent-this-week queues: ' + UNAVAILABLE,
        '| Group | Student | Status |',
        '| --- | --- | --- |',
        ...registered.students
          .slice(0, 12)
          .map(
            (s) =>
              `| Registered | ${displayName(s)} | ${statusLabel(s.status)} |`,
          ),
        ...deactivated.students
          .slice(0, 8)
          .map(
            (s) =>
              `| Deactivated | ${displayName(s)} | ${statusLabel(s.status)} |`,
          ),
        'Next action: Open student profile, Assign tutor, or Notify coordinator.',
      ],
    };
  }

  private async openStudentProfile(
    q: string,
    focusedId: string | undefined,
    labelHint: string | undefined,
    name: string | null,
  ): Promise<SkillResult> {
    let studentId = focusedId;
    let hint = labelHint;
    const warnings: string[] = [];

    if (!studentId && name) {
      const search = await softCall('GET /search/global', () =>
        this.users.globalSearch(name),
      );
      warnings.push(...collectWarnings(search));
      const hit = search.data?.students[0];
      if (hit?.id) {
        studentId = hit.id;
        hint = displayName(hit) || name;
        rememberProfile(`student:${studentId}`, hit);
      }
    }

    if (!studentId) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'student_profile_needs_entity',
        data: null,
        facts: ambiguousEntityFacts('student'),
      };
    }

    const detail = await this.focusedStudentDetail(studentId, hint, q);
    if (warnings.length) {
      detail.warnings = [...(detail.warnings ?? []), ...warnings];
      detail.facts = [
        ...(detail.facts ?? []),
        ...warnings.map((w) => `PARTIAL: ${w}`),
      ];
    }
    return detail;
  }

  private async loadStudentRow(
    studentId: string,
    labelHint: string | undefined,
  ): Promise<{
    student: EdnovUserRow | null;
    warnings: string[];
    source: string;
  }> {
    const cacheKey = `student:${studentId}`;
    const byStudent = await softCall('GET /users/students/:id', () =>
      this.users.findStudentById(studentId),
    );
    if (byStudent.ok && byStudent.data) {
      rememberProfile(cacheKey, byStudent.data);
      return { student: byStudent.data, warnings: [], source: 'GET /users/students/:id' };
    }
    if (byStudent.forbidden) {
      return {
        student: null,
        warnings: collectWarnings(byStudent),
        source: 'GET /users/students/:id',
      };
    }
    if (labelHint && labelHint.length >= 2) {
      const search = await softCall('GET /search/global', () =>
        this.users.globalSearch(labelHint),
      );
      const hit = search.data?.students.find((s) => s.id === studentId);
      if (hit) {
        rememberProfile(cacheKey, hit);
        logFallback('GET /users/students/:id', 'GET /search/global');
        return {
          student: hit,
          warnings: collectWarnings(byStudent, search),
          source: 'GET /search/global',
        };
      }
    }
    const cached = recallProfile<EdnovUserRow>(cacheKey);
    if (cached && byStudent.timedOut) {
      logFallback('GET /users/students/:id', 'cached profile');
      return {
        student: cached,
        warnings: [
          ...collectWarnings(byStudent),
          'Using recently cached student profile because live GET timed out.',
        ],
        source: 'cached profile',
      };
    }
    return {
      student: null,
      warnings: collectWarnings(byStudent),
      source: 'none',
    };
  }

  private async focusedStudentDetail(
    studentId: string,
    labelHint: string | undefined,
    q: string,
  ): Promise<SkillResult> {
    const loaded = await this.loadStudentRow(studentId, labelHint);
    if (!loaded.student) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'focused_student_partial',
        data: null,
        facts: answerFacts({
          answer: labelHint
            ? `Could not load the live profile for “${labelHint}” right now.`
            : 'Could not load the selected student profile right now.',
          explanation:
            loaded.warnings.join(' ') ||
            'GET /users/students/:id did not return a row.',
          reasoning:
            'A timeout or authorization miss is not a missing-document case — retry or open the student in Ednov.',
          next: 'Select the student on the page and ask again, or open Students.',
          source: loaded.source,
        }),
        warnings: loaded.warnings,
      };
    }

    const student = loaded.student;
    const label = displayName(student) || labelHint || 'focused student';
    const extraWarnings: string[] = [...loaded.warnings];

    let tutorLine = 'Tutor: not loaded.';
    let recentActivity = 'Recent activity: not loaded.';
    try {
      const pairsPage = await softCall('GET /sessions/student-tutor-pairs', () =>
        this.matching.listPairsPage({
          page: 1,
          pageSize: 20,
          studentId,
        }),
      );
      extraWarnings.push(...collectWarnings(pairsPage));
      if (pairsPage.ok && pairsPage.data?.pairs.length) {
        const pair = pairsPage.data.pairs[0];
        const tutorName = displayName(pair.tutor ?? {}) || '—';
        tutorLine = `Tutor (latest pair): ${tutorName} (${pairsPage.data.pairs.length} pair row(s)).`;
        const last = formatDate(
          pair.lastSession?.sessionDate ?? pair.session?.sessionDate,
        );
        const next = formatDate(pair.nextSession?.sessionDate);
        recentActivity = `Recent activity: last session ${last ?? 'n/a'}; next session ${next ?? 'n/a'}.`;
      } else if (pairsPage.ok) {
        tutorLine = 'Tutor: no pair for this student in live Matching.';
        recentActivity =
          'Recent activity: no matching pair — last/next session not on Matching payload.';
      } else {
        tutorLine = 'Tutor / matching history could not be retrieved (partial).';
        recentActivity =
          'Recent activity: Matching timed out — profile still shown from Users.';
      }
    } catch {
      tutorLine = 'Tutor / matching history could not be retrieved (partial).';
      recentActivity = 'Recent activity: Matching could not be retrieved (partial).';
    }

    const reports = await softCall('GET /sessions/reports', () =>
      this.academic.listReports(5, { studentId }),
    );
    extraWarnings.push(...collectWarnings(reports));
    const reportLine =
      reports.ok && reports.data?.length
        ? `Recent reports: ${reports.data.length} row(s) (latest status ${reports.data[0]?.status ?? 'n/a'}).`
        : reports.ok
          ? 'Recent reports: none returned for this student.'
          : 'Recent reports: could not be retrieved (partial).';

    const facts = answerFacts({
      answer: `Student ${label} — status ${statusLabel(student.status)}, establishment ${establishmentLabel(student)}.`,
      explanation: `Resolved via ${loaded.source}, then enriched with matching and reports when available.`,
      reasoning:
        'Profile, status and establishment come from Users APIs; tutor and recent sessions come from Matching pairs; reports from GET /sessions/reports. Missing slices are listed as partial, not as “not found in documents”.',
      next: 'Open student profile, Assign tutor, View reports, or Schedule session.',
      source: loaded.source,
      extra: [
        `Current status: ${statusLabel(student.status)}.`,
        `Establishment: ${establishmentLabel(student)}.`,
        student.userProfiles?.[0]?.level?.label
          ? `Level: ${student.userProfiles[0].level.label}.`
          : 'Level: not on payload.',
        tutorLine,
        recentActivity,
        reportLine,
        typeof student.pendingActivation === 'boolean'
          ? student.pendingActivation
            ? 'Onboarding: email activation still pending.'
            : 'Onboarding: email activation not flagged pending.'
          : '',
        ...extraWarnings.map((w) => `PARTIAL: ${w}`),
      ],
    });

    if (asksTimeline(q) || asksHistory(q)) {
      const history = await softCall('GET /users/:id/status-history', () =>
        this.users.getStudentStatusHistory(studentId),
      );
      if (history.ok && history.data?.length) {
        facts.push(
          '### Status history',
          '| When | From | To | Source |',
          '| --- | --- | --- | --- |',
          ...history.data.slice(0, 12).map((h) => {
            const when = formatDate(h.createdAt) ?? '—';
            return `| ${when} | ${statusLabel(h.previousStatus)} | ${statusLabel(h.newStatus)} | ${h.source ?? '—'} |`;
          }),
        );
      } else {
        facts.push(
          history.warning
            ? `PARTIAL: ${history.warning}`
            : 'Status history: no rows returned.',
        );
      }
    }

    return {
      skillId: this.id,
      ok: true,
      operation: 'focused_student_detail',
      data: summarizeStudent(student),
      facts: facts.filter(Boolean),
      warnings: extraWarnings.length ? extraWarnings : undefined,
    };
  }

  private async diagnoseStudent(args: {
    studentId: string;
    labelHint?: string;
    question: string;
  }): Promise<SkillResult> {
    const detail = await this.focusedStudentDetail(
      args.studentId,
      args.labelHint,
      args.question,
    );
    const student = await this.users
      .findStudentById(args.studentId)
      .catch(() => null);
    const label =
      (student ? displayName(student) : null) ||
      args.labelHint ||
      'focused student';
    const status = student?.status ?? null;
    const facts = [...(detail.facts ?? [])];

    facts.push('### Diagnostic structure (live)');

    if (asksCannotMatch(args.question) || /\b(match|appari|tuteur|tutor)\b/i.test(args.question)) {
      try {
        const pairs = await this.matching.listPairsPage({
          page: 1,
          pageSize: 10,
          studentId: args.studentId,
        });
        if (pairs.pairs.length) {
          facts.push(
            `## Current situation — matching: ${label} HAS ${pairs.pairs.length} pair row(s) (not unmatched).`,
          );
          facts.push('## Completed: at least one Matching pair exists.');
          facts.push('## Missing: none for “has a tutor” — verify session scope if coordinator expected unmatched.');
        } else {
          facts.push(
            `## Current situation — matching: ${label} has NO pair in live Matching query.`,
          );
          facts.push('## Completed: student record exists.');
          facts.push(
            '## Missing: session_student_tutor_pairs row for this student (in authorization scope).',
          );
          facts.push(
            '## Rules: Matching assignment is session-scoped; eligibility needs a focused session’s assignment-candidates.',
          );
          facts.push(
            '## Next action: open a session → Assign tutor, or open Matching.',
          );
        }
      } catch {
        facts.push('Matching diagnosis could not load pairs — do not invent a blocker.');
      }
    }

    if (
      asksMissingOnboarding(args.question) ||
      status === 'registered' ||
      student?.pendingActivation === true
    ) {
      facts.push(
        `## Current situation — onboarding: status=${statusLabel(status)}` +
          (typeof student?.pendingActivation === 'boolean'
            ? `; pendingActivation=${student.pendingActivation}`
            : ''),
      );
      if (status === 'registered') {
        facts.push(
          '## Completed: student account created with status registered (Inscrit).',
        );
        facts.push(
          '## Missing: transition to accompanied typically requires presence threshold / accompaniment workflow (see docs when cited).',
        );
      }
      if (student?.pendingActivation) {
        facts.push('## Missing: email activation still pending.');
      }
      if (status === 'accompanied') {
        facts.push('## Completed: status accompanied — onboarding/account accompaniment active.');
        facts.push('## Missing: none for account status.');
      }
      facts.push(
        '## Next action: open student profile; complete activation or accompaniment steps in Ednov.',
      );
    }

    if (asksMissingReport(args.question)) {
      facts.push(
        '## Current situation — reports: student-scoped missing-report flag: ' +
          UNAVAILABLE,
      );
      facts.push(
        '## Next action: View reports on Reports page or focused session reports.',
      );
    }

    if (
      asksInactive(args.question) ||
      status === 'deactivated'
    ) {
      facts.push(
        `## Current situation — inactive/archived: status=${statusLabel(status)}.`,
      );
      if (status === 'deactivated') {
        facts.push('## Completed: deactivation recorded on account.');
        facts.push(
          student?.reactivationTargetStatus
            ? `## Rules / next: reactivation target ${statusLabel(student.reactivationTargetStatus)} (from present-session count when provided).`
            : '## Next action: review deactivation reason on profile; use Ednov Reactivate when authorized.',
        );
      } else {
        facts.push(
          `Student is not deactivated (current: ${statusLabel(status)}).`,
        );
      }
    }

    return {
      skillId: this.id,
      ok: true,
      operation: 'student_diagnosis',
      data: detail.data,
      facts,
      warnings: detail.warnings,
    };
  }
}

function unavailableResult(
  skillId: BusinessSkillId,
  operation: string,
  facts: string[],
): SkillResult {
  return {
    skillId,
    ok: true,
    operation,
    data: null,
    facts,
  };
}

function extractStudentSearch(question: string): string | null {
  const allMatch = question.match(
    /\b(?:all|tous?|toutes?)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+)\b/iu,
  );
  if (allMatch?.[1]) return allMatch[1].trim();

  const named = extractPersonName(question);
  if (named) return named;

  const single = question.match(
    /\b(?:student|élève|eleve|élèves|eleves|learner)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+)\b/iu,
  );
  if (single?.[1]) return single[1].trim();

  const findSingle = question.match(
    /\b(?:find|search|cherche|montre|show|who is|qui est|open|ouvre|ouvrir|profil(?:e)? (?:of|de))\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+)\b/iu,
  );
  if (findSingle?.[1]) return findSingle[1].trim();

  return null;
}

function statusLabel(status?: string | null): string {
  if (!status) return '—';
  return STATUS_LABEL[status] ?? status;
}

function establishmentLabel(student: EdnovUserRow): string {
  const est = student.userEstablishments?.[0]?.establishment;
  if (est?.name?.trim()) {
    return est.city?.trim()
      ? `${est.name.trim()} (${est.city.trim()})`
      : est.name.trim();
  }
  return '—';
}

function summarizeStudent(student: EdnovUserRow) {
  return {
    name: displayName(student),
    status: student.status ?? null,
    establishment: establishmentLabel(student),
    pendingActivation:
      typeof student.pendingActivation === 'boolean'
        ? student.pendingActivation
        : null,
    level: student.userProfiles?.[0]?.level?.label ?? null,
  };
}

function formatDate(value?: string | Date | null): string | null {
  if (!value) return null;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function asksCount(q: string): boolean {
  return /\b(how many|combien|count|nombre)\b/i.test(q);
}

function wantsStudentProfile(
  q: string,
  hasFocus: boolean,
  name: string | null,
): boolean {
  const open = /\b(open|ouvre|ouvrir|fiche)\b/i.test(q);
  const showProfile = /\b(show|montre|affiche)\b.{0,50}\b(profil(?:e)?|fiche)\b/i.test(
    q,
  );
  const thisStudent =
    /\b(this student|cet élève|cet eleve|cette élève|cette eleve)\b/i.test(q);
  if ((open || showProfile || asksOpenOrShowProfile(q)) && thisStudent) {
    return true;
  }
  if ((open || showProfile) && (hasFocus || Boolean(name))) {
    return /\b(student|élève|eleve|profil|profile|fiche)\b/i.test(q) || Boolean(name);
  }
  return false;
}

function asksSearch(q: string): boolean {
  return /\b(find|search|cherche|montre|show|who is|qui est|all|tous?)\b/i.test(
    q,
  );
}

function asksList(q: string): boolean {
  return /\b(list|liste|show|montre|which|quels?|quelles?)\b/i.test(q);
}

function asksWithoutTutor(q: string): boolean {
  return /\b(without a tutor|sans tuteur|no tutor|pas de tuteur|unmatched|non.?appari|without matching|sans matching|sans appariement)\b/i.test(
    q,
  );
}

function asksNoActiveMatching(q: string): boolean {
  return /\b(no active matching|sans appariement|without matching|pas d['’]?appariement|no matching|sans matching|élèves? sans matching|students? without matching)\b/i.test(
    q,
  );
}

function asksWithoutSessions(q: string): boolean {
  return /\b(without (a )?session|sans séance|sans seance|no session|pas de séance|pas de seance)\b/i.test(
    q,
  );
}

function asksNoSessionOver30(q: string): boolean {
  return (
    /\b(30|trente)\b/i.test(q) &&
    /\b(session|séance|seance|days|jours)\b/i.test(q)
  );
}

function asksMissingReports(q: string): boolean {
  return /\b(missing report|sans compte.?rendu|without report|rapports? manquants?|comptes?.?rendus? manquants?)\b/i.test(
    q,
  );
}

function asksAbsentThisWeek(q: string): boolean {
  return (
    /\b(absent|absences?)\b/i.test(q) &&
    /\b(week|semaine|this week|cette semaine)\b/i.test(q)
  );
}

function asksByEstablishment(q: string): boolean {
  return /\b(by establishment|par établissement|par etablissement|establishment|établissement|etablissement)\b/i.test(
    q,
  );
}

function asksByProgram(q: string): boolean {
  return /\b(by program|par programme|program|programme)\b/i.test(q) &&
    /\b(student|élève|eleve|learners?)\b/i.test(q);
}

function asksRegisteredToday(q: string): boolean {
  return (
    /\b(registered today|inscrits? aujourd['’]?hui|inscrits? ce jour|nouveaux inscrits|students? (registered|created) today)\b/i.test(
      q,
    ) ||
    (/\b(inscrits?|registered)\b/i.test(q) &&
      /\b(today|aujourd['’]?hui)\b/i.test(q))
  );
}

function asksJoinedThisMonth(q: string): boolean {
  return (
    /\b(joined this month|inscrits? (ce mois|this month)|nouveaux élèves? (du mois|ce mois)|students? (who )?joined)\b/i.test(
      q,
    ) ||
    (/\b(joined|inscrits?|created)\b/i.test(q) &&
      /\b(this month|ce mois|mois en cours)\b/i.test(q))
  );
}

function asksRequiringAttention(q: string): boolean {
  return /\b(requiring attention|need attention|à suivre|a suivre|attention|alertes?|priority|prioritaires?)\b/i.test(
    q,
  );
}

function asksStatusList(q: string): boolean {
  return /\b(registered|inscrits?|accompanied|accompagnés?|accompagnes?|active|actifs?|inactive|inactifs?|archived|archivés?|deactivated|désactivés?|waiting onboarding|en attente)\b/i.test(
    q,
  );
}

function asksTimeline(q: string): boolean {
  return /\b(timeline|history|historique|parcours|progress|onboarding|latest sessions?|dernières? séances?|dernieres? seances?)\b/i.test(
    q,
  );
}

function asksHistory(q: string): boolean {
  return /\b(history|historique|status history|changements? de statut)\b/i.test(
    q,
  );
}

function asksProfile(q: string): boolean {
  return /\b(profile|profil|summarize|résume|resume|summary|overview|aperçu|apercu)\b/i.test(
    q,
  );
}

function asksDeixis(q: string): boolean {
  return /\b(this student|cet élève|cet eleve|cette élève|cette eleve|he|she|his|her|their|son|sa|leur|il|elle|lui)\b/i.test(
    q,
  );
}

function asksDiagnostic(q: string): boolean {
  return (
    asksCannotMatch(q) ||
    asksMissingOnboarding(q) ||
    asksMissingReport(q) ||
    asksInactive(q) ||
    /\b(why|pourquoi|blocked|bloqué|bloque|what.?s missing|que manque|diagnosis|diagnost)/i.test(
      q,
    )
  );
}

function asksCannotMatch(q: string): boolean {
  return /\b(cannot match|can'?t match|impossible.*appari|not matched|pas.?appari|why.*(tutor|tuteur|match))\b/i.test(
    q,
  );
}

function asksMissingOnboarding(q: string): boolean {
  return /\b(missing onboarding|onboarding (incomplet|incomplete|missing)|parcours incomplet|activation)\b/i.test(
    q,
  );
}

function asksMissingReport(q: string): boolean {
  return /\b(missing report|rapport manquant|compte.?rendu manquant|no report)\b/i.test(
    q,
  );
}

function asksInactive(q: string): boolean {
  return /\b(inactive|inactif|archived|archivé|archive|deactivated|désactivé|desactive)\b/i.test(
    q,
  );
}
