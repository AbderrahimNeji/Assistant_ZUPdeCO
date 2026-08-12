import { Injectable } from '@nestjs/common';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { UserAdapter } from '../../integration/adapters/user.adapter';
import { RequestContextStore } from '../../integration/request-context';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import {
  answerFacts,
  apiPartialFacts,
  displayName,
  extractPersonName,
  safeErrorMessage,
} from '../skill.utils';

const UNAVAILABLE = 'unavailable';

/** Statuses tutors still need to complete (à saisir). */
const PENDING_SAISIE = ['to_complete', 'draft', 'overdue'] as const;

type ReportRow = {
  id?: string;
  sessionId?: string;
  status?: string;
  sessionDisplayName?: string;
  authorName?: string;
  authorId?: string;
  validatedAt?: string | null;
  validatedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

/**
 * Session reports (comptes-rendus). Live Ednov GET /sessions/reports +
 * /sessions/report-kpis + session/report detail. Never invents statuses or lists.
 */
@Injectable()
export class ReportSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'report';
  readonly domains = [
    /\b(report|reports|compte.?rendu|comptes?.?rendus?|\bcr\b|submitted|soumis|soumettre|valid(?:er|ation|é|e)?|reject(?:ed)?|refus(?:é|e)?|overdue|en\s+retard|missing|manqu(?:ant|e)|à\s+saisir|a\s+saisir|to_complete|pending|en attente de validation|à valider)\b/i,
    /\b(rapports? par|reports? by)\b/i,
  ];
  readonly domainTags = [
    'report',
    'compte-rendu',
    'validation',
    'missing-reports',
    'report-kpis',
  ];
  readonly capabilities: SkillCapability[] = [
    'list',
    'status',
    'count',
    'search',
    'stats',
  ];

  constructor(
    private readonly users: UserAdapter,
    private readonly academic: AcademicAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const q = ctx.question;
      const name = extractPersonName(q);
      const studentId = this.users.resolveFocusedStudentId();
      const tutorId = this.users.resolveFocusedTutorId();
      const sessionId = this.academic.resolveFocusedSessionId();
      const reportId = this.academic.resolveFocusedReportId();
      const pageFilters = this.pageListFilters();

      if (asksPendingValidation(q)) {
        return this.listByStatuses(
          ['submitted'],
          'pending_validation',
          'Pending validation = status `submitted` (submittedPendingValidation KPI).',
          q,
          pageFilters,
        );
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      if (asksRejected(q)) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'rejected_unavailable',
          data: null,
          facts: [
            'Rejected reports: ' +
              UNAVAILABLE +
              ' — SessionReportStatus has no `rejected` value (only to_complete, draft, submitted, validated, overdue).',
            'There is no PATCH …/reject endpoint for session reports.',
            'Do not invent a rejected queue.',
            'Next action: filter submitted / overdue on Comptes-rendus, or ask for pending validation (status=submitted).',
          ],
        };
      }

      if (asksRules(q)) {
        return this.rulesFacts();
      }

      if (asksTimeline(q) && !reportId && !sessionId && !studentId && !tutorId && !name) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'timeline_needs_focus',
          data: null,
          facts: [
            'Report / validation / session timelines need a focused report, session, student, or tutor (ApplicationContext) or a student name.',
            'Dedicated audit-trail timeline API for reports: ' + UNAVAILABLE + '.',
            'Next action: open a compte-rendu or select a session / student / tutor, then ask again.',
          ],
        };
      }

      if (asksKpisOrCount(q) && !name && !asksListByStatus(q)) {
        return this.kpisOverview(q);
      }

      if (asksMissing(q)) {
        return this.missingReports(q);
      }

      if (asksValidated(q)) {
        return this.listByStatuses(
          ['validated'],
          'validated_reports',
          'Validated reports (status=validated).',
          q,
          pageFilters,
        );
      }

      if (asksPendingSaisie(q) || asksTutorsNeedComplete(q)) {
        return this.listByStatuses(
          [...PENDING_SAISIE],
          'pending_saisie',
          'Tutors still need to complete = statuses to_complete, draft, overdue (pendingReports KPI / à saisir).',
          q,
          pageFilters,
        );
      }

      if (asksByTutor(q)) {
        if (tutorId) return this.tutorReports(tutorId, q);
        if (name) {
          const tutors = await this.users.findTutorsByName(name);
          if (tutors[0]?.id) return this.tutorReports(tutors[0].id, q);
        }
        return this.reportsGroupedByAuthor(q);
      }

      if (asksByStudent(q) && !studentId && !name) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'reports_by_student_needs_name',
          data: null,
          facts: [
            'Reports by student use GET /sessions/reports?participantId= (UUID).',
            'Name a student or open their profile, then ask again — do not invent a per-student report census.',
            'Next action: “rapports de [prénom nom]” or select the student in Ednov.',
          ],
        };
      }

      if (asksTodayOrWeek(q) || pageFilters.dateFrom || pageFilters.dateTo) {
        const dateParams = this.resolveDateParams(q, pageFilters);
        if (asksListByStatus(q) || asksMissing(q)) {
          // fall through handled above; date-scoped list below
        }
        return this.listWithParams(
          {
            ...dateParams,
            ...(pageFilters.statuses?.length
              ? { statuses: pageFilters.statuses }
              : {}),
            ...(pageFilters.search ? { search: pageFilters.search } : {}),
          },
          'reports_by_date',
          dateParams.dateFrom || dateParams.dateTo
            ? `Reports filtered by createdAt dateFrom=${dateParams.dateFrom ?? '—'} dateTo=${dateParams.dateTo ?? '—'} (GET /sessions/reports).`
            : 'Reports list (no date filter resolved).',
          q,
        );
      }

      if (name || (studentId && asksStudentScoped(q))) {
        return this.findForStudent({
          studentId,
          name,
          sessionId,
          labelHint:
            ctx.applicationContext?.student?.label?.trim() ||
            ctx.applicationContext?.selection?.primary?.label?.trim(),
          question: q,
        });
      }

      if (reportId && sessionId) {
        return this.focusedReport(sessionId, reportId, q);
      }

      if (reportId && !sessionId) {
        return this.focusedReportWithoutSession(reportId, q);
      }

      if (sessionId) {
        return this.sessionReports(sessionId, q);
      }

      if (studentId) {
        return this.findForStudent({
          studentId,
          name: null,
          sessionId: undefined,
          labelHint: ctx.applicationContext?.student?.label?.trim(),
          question: q,
        });
      }

      if (tutorId) {
        return this.tutorReports(tutorId, q);
      }

      if (!isStaffRole(ctx.user.role)) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'report_scope_note',
          data: null,
          facts: [
            'Report verification requires a selected student/session/report or staff-authorized list endpoints.',
            'Next action: open a compte-rendu or séance in Ednov, then ask again.',
          ],
        };
      }

      if (pageFilters.search || pageFilters.statuses?.length) {
        return this.listWithParams(
          {
            ...(pageFilters.statuses?.length
              ? { statuses: pageFilters.statuses }
              : {}),
            ...(pageFilters.search ? { search: pageFilters.search } : {}),
            ...this.resolveDateParams(q, pageFilters),
          },
          'reports_page_filters',
          'Reports using ApplicationContext page filters (Comptes-rendus).',
          q,
        );
      }

      return this.reportsOverview();
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

  private rulesFacts(): SkillResult {
    return {
      skillId: this.id,
      ok: true,
      operation: 'report_rules',
      data: null,
      facts: [
        '## Report statuses (SessionReportStatus)',
        '- `to_complete` — draft shell / à saisir',
        '- `draft` — in progress',
        '- `submitted` — waiting coordinator/volunteer validation',
        '- `validated` — validated (PATCH …/validate)',
        '- `overdue` — past due for completion',
        '',
        '## Validation rules (from Ednov API)',
        '- Only reports with status `submitted` can be validated (PATCH /sessions/:id/reports/:reportId/validate).',
        '- Validation requires the volunteer/coordinator write scope (action-validate-row on reports).',
        '- There is no `rejected` status and no reject endpoint.',
        '',
        '## List scope',
        '- GET /sessions/reports returns reports whose session has already started (future sessions excluded).',
        '- KPIs: missingReports, overdueReports, pendingReports (à saisir), submittedPendingValidation, validatedReports via GET /sessions/report-kpis.',
        '',
        '## Next actions',
        '- Open report · View session/student/tutor · Ask Copilot to validate (confirmation) · Notify coordinator (advice) · Generate summary from live facts only.',
      ],
    };
  }

  private async kpisOverview(q: string): Promise<SkillResult> {
    try {
      const kpis = await this.academic.getReportKpis();
      const facts = [
        '## Report KPIs (GET /sessions/report-kpis, authorization-scoped)',
        `| Metric | Value |`,
        `| --- | ---: |`,
        `| missingReports (completed/closed sessions without a report row) | ${num(kpis.missingReports)} |`,
        `| pendingReports (à saisir: to_complete + draft + overdue) | ${num(kpis.pendingReports)} |`,
        `| overdueReports | ${num(kpis.overdueReports)} |`,
        `| submittedPendingValidation (status=submitted) | ${num(kpis.submittedPendingValidation)} |`,
        `| validatedReports | ${num(kpis.validatedReports)} |`,
      ];

      if (asksCountWaitingValidation(q)) {
        facts.push(
          `Count waiting validation: ${num(kpis.submittedPendingValidation)} (field submittedPendingValidation).`,
        );
      }
      if (asksMissing(q)) {
        facts.push(
          `Missing reports count: ${num(kpis.missingReports)}. List of missing sessions: use filter overdue/to_complete lists below — a dedicated missing-sessions list id field is not exposed beyond this count.`,
        );
      }

      facts.push(
        'Next action: Open Comptes-rendus filtered by submitted / to_complete, or ask for the pending-validation list.',
      );

      return {
        skillId: this.id,
        ok: true,
        operation: 'report_kpis',
        data: kpis,
        facts,
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'report_kpis_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/report-kpis', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async missingReports(q: string): Promise<SkillResult> {
    const kpisResult = await this.kpisOverview(q);
    const list = await this.listByStatuses(
      [...PENDING_SAISIE],
      'missing_or_incomplete',
      'Incomplete / overdue reports (proxy for “not submitted”). Sessions with zero report row appear only in missingReports KPI — no dedicated missing-session list endpoint.',
      q,
      this.pageListFilters(),
    );

    return {
      skillId: this.id,
      ok: true,
      operation: 'missing_reports',
      data: {
        kpis: kpisResult.data,
        incomplete: list.data,
      },
      facts: [
        ...(kpisResult.facts ?? []),
        '',
        '### Incomplete report rows (to_complete / draft / overdue)',
        ...(list.facts ?? []),
        '',
        'Students who never got a report row on a completed session: only counted in missingReports — list of student names for those sessions: ' +
          UNAVAILABLE +
          ' (no students-with-missing-reports endpoint).',
        'Next action: open Comptes-rendus → filter à saisir / overdue; create draft via Copilot only with a focused session + confirmation.',
      ],
    };
  }

  private async listByStatuses(
    statuses: string[],
    operation: string,
    intro: string,
    q: string,
    pageFilters: PageListFilters,
  ): Promise<SkillResult> {
    const dateParams = this.resolveDateParams(q, pageFilters);
    return this.listWithParams(
      {
        statuses,
        ...dateParams,
        ...(pageFilters.search ? { search: pageFilters.search } : {}),
      },
      operation,
      intro,
      q,
    );
  }

  private async listWithParams(
    params: Record<
      string,
      string | number | boolean | Array<string | number> | undefined
    >,
    operation: string,
    intro: string,
    q: string,
  ): Promise<SkillResult> {
    try {
      const { items, total } = await this.academic.listReportsPage(20, params);
      const countLabel =
        total != null
          ? `${total} (API total; showing ${items.length})`
          : `${items.length} in this page`;
      const table = [
        '| # | Session | Status | Author | Validated |',
        '| ---: | --- | --- | --- | --- |',
        ...(items.length
          ? items.map((r, i) => reportTableRow(r, i + 1))
          : ['| — | (none) | — | — | — |']),
      ];

      if (operation === 'pending_validation') {
        return {
          skillId: this.id,
          ok: true,
          operation,
          data: { params, items, total },
          facts: answerFacts({
            answer: items.length
              ? `${countLabel} session report(s) are awaiting validation (status submitted).`
              : 'No session reports are awaiting validation right now (GET /sessions/reports?statuses=submitted returned zero rows).',
            explanation:
              'In Ednov, “en attente de validation” = SessionReportStatus `submitted`. Coordinators validate with PATCH …/validate. This is not matching-pair validation.',
            reasoning:
              'Submitted reports are already filled by the tutor and waiting for coordinator/volunteer sign-off. Empty list means nothing is in that queue in your authorization scope (started sessions only).',
            next: items.length
              ? 'Open Comptes-rendus filtered on Soumis, then validate a row.'
              : 'Open Comptes-rendus, or ask for reports still à saisir (to_complete / draft / overdue).',
            source: 'Comptes-rendus (GET /sessions/reports?statuses=submitted)',
            extra: [
              'If the user asked which reports are waiting: list the table below. Do not reply that the information was not found.',
              '',
              ...table,
              '',
              statusExplanation(),
            ],
          }),
        };
      }

      const facts = [
        intro,
        total != null
          ? `Total matching (API total): ${total}. Showing up to ${items.length} row(s).`
          : `Showing ${items.length} row(s) (API total field absent).`,
        '',
        ...table,
        '',
        statusExplanation(),
        nextActionsHint(q),
      ];
      return {
        skillId: this.id,
        ok: true,
        operation,
        data: { params, items, total },
        facts,
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: `${operation}_partial`,
        data: null,
        facts: apiPartialFacts('GET /sessions/reports', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async focusedReport(
    sessionId: string,
    reportId: string,
    q: string,
  ): Promise<SkillResult> {
    try {
      const report = await this.academic.getSessionReport(sessionId, reportId);
      let session: unknown = null;
      try {
        session = await this.academic.getSession(sessionId);
      } catch {
        session = null;
      }

      const facts = [
        `Focused report (ApplicationContext): ${reportLabel(report)}.`,
        `Status: ${report.status ?? '—'}`,
        `Session: ${report.sessionDisplayName ?? sessionId}`,
        `Author: ${report.authorName ?? '—'}`,
        report.validatedAt
          ? `Validated at: ${String(report.validatedAt)} by ${report.validatedByName ?? '—'}`
          : 'Validated at: —',
        `Created: ${report.createdAt ? String(report.createdAt) : '—'} · Updated: ${report.updatedAt ? String(report.updatedAt) : '—'}`,
        '',
        statusExplanation(),
        explanationForStatus(report.status),
        '',
        asksTimeline(q)
          ? 'Validation timeline fields available on this report: createdAt, updatedAt, validatedAt, validatedByName. Full audit trail: ' +
            UNAVAILABLE +
            '.'
          : 'Ask for rules / next action / validate if status is submitted.',
        nextActionsHint(q, report.status),
      ];

      return {
        skillId: this.id,
        ok: true,
        operation: 'focused_report',
        data: { report: redactReport(report), session },
        facts,
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'focused_report_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/:id/reports/:id', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async focusedReportWithoutSession(
    reportId: string,
    q: string,
  ): Promise<SkillResult> {
    try {
      const { items } = await this.academic.listReportsPage(5, {
        search: reportId,
      });
      const match = items.find((r) => r.id === reportId);
      if (match?.sessionId) {
        return this.focusedReport(match.sessionId, reportId, q);
      }
      return {
        skillId: this.id,
        ok: true,
        operation: 'focused_report_needs_session',
        data: { reportId, items },
        facts: [
          `Report ${reportId} is focused but sessionId is missing from ApplicationContext.`,
          'GET /sessions/:sessionId/reports/:reportId requires sessionId.',
          'Next action: open the compte-rendu from Comptes-rendus (so sessionId is wired) or open the séance.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'focused_report_needs_session',
        data: { reportId },
        facts: [
          `Report ${reportId} focused without sessionId — detail fetch unavailable.`,
          'Endpoint needed: GET /sessions/:sessionId/reports/:reportId',
        ],
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async sessionReports(
    sessionId: string,
    q: string,
  ): Promise<SkillResult> {
    try {
      const reports = await this.academic.getSessionReports(sessionId);
      let session: unknown = null;
      try {
        session = await this.academic.getSession(sessionId);
      } catch {
        session = null;
      }

      const facts = [
        `Reports for focused session ${sessionId} (GET /sessions/:id/reports): ${reports.length} row(s).`,
        '',
        '| # | Status | Author | Validated |',
        '| ---: | --- | --- | --- |',
        ...(reports.length
          ? reports.map((r, i) => reportTableRow(r, i + 1))
          : ['| — | (none) | — | — |']),
        '',
        statusExplanation(),
        reports.length === 0
          ? 'No report yet for this session — next action: create draft (Copilot confirmation → POST /sessions/:id/reports) then complete in Ednov.'
          : nextActionsHint(q, reports[0]?.status),
      ];

      return {
        skillId: this.id,
        ok: true,
        operation: 'session_reports',
        data: { sessionId, session, reports: reports.map(redactReport) },
        facts,
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'session_reports_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/:id/reports', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async findForStudent(args: {
    studentId?: string;
    name: string | null;
    sessionId?: string;
    labelHint?: string;
    question: string;
  }): Promise<SkillResult> {
    let participantId = args.studentId;
    let studentLabel = args.labelHint || args.name || 'student';

    if (!participantId && args.name) {
      try {
        const found = await this.users.searchStudents(args.name, 5);
        if (found.length === 1) {
          participantId = found[0].id;
          studentLabel = displayName(found[0]);
        } else if (found.length > 1) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'student_ambiguous',
            data: { candidates: found.map((s) => ({ id: s.id, name: displayName(s) })) },
            facts: [
              `Several students match “${args.name}”. Pick one:`,
              ...found
                .slice(0, 5)
                .map((s) => `- ${displayName(s)} (${s.id})`),
              'Next action: open the student profile or Compte-rendu filters with that name.',
            ],
          };
        } else {
          // Fall back to reports search (participant names in search filter)
          return this.listWithParams(
            {
              search: args.name,
              ...(args.sessionId ? { sessionId: args.sessionId } : {}),
            },
            'reports_search_name',
            `No student directory hit for “${args.name}”; searching reports via GET /sessions/reports?search= (participant names / script / subject).`,
            args.question,
          );
        }
      } catch {
        return this.listWithParams(
          {
            search: args.name || undefined,
            ...(args.sessionId ? { sessionId: args.sessionId } : {}),
          },
          'reports_search_name_fallback',
          `Student search failed; using reports?search=.`,
          args.question,
        );
      }
    }

    if (!participantId) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'student_reports_needs_id',
        data: null,
        facts: [
          'Cannot resolve student id for participantId filter.',
          'Next action: select the student in Ednov or name them uniquely.',
        ],
      };
    }

    try {
      const params: Record<
        string,
        string | number | boolean | Array<string | number> | undefined
      > = {
        participantId,
        ...(args.sessionId ? { sessionId: args.sessionId } : {}),
      };
      const { items, total } = await this.academic.listReportsPage(15, params);

      // /users/students/:id/reports is not a documented Ednov route — do not call it.
      const facts = [
        `Reports for student “${studentLabel}” (GET /sessions/reports?participantId=…).`,
        args.sessionId
          ? `Scoped to focused session ${args.sessionId}.`
          : 'All started sessions in scope (no session filter).',
        total != null
          ? `Total: ${total}. Showing ${items.length}.`
          : `Showing ${items.length} row(s).`,
        '',
        '| # | Session | Status | Author | Validated |',
        '| ---: | --- | --- | --- | --- |',
        ...(items.length
          ? items.map((r, i) => reportTableRow(r, i + 1))
          : ['| — | (none) | — | — | — |']),
        '',
        asksTimeline(args.question)
          ? 'Per-report createdAt/validatedAt shown when present. Student report history beyond this list: use these rows only — dedicated history endpoint: ' +
            UNAVAILABLE +
            '.'
          : statusExplanation(),
        items.some((r) => r.status === 'submitted')
          ? 'Next action: open a submitted report and validate (confirmation) if you have rights.'
          : 'Next action: View session · Notify coordinator if tutors still need to complete.',
      ];

      return {
        skillId: this.id,
        ok: true,
        operation: 'student_reports',
        data: { participantId, studentLabel, items, total },
        facts,
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'student_reports_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/reports', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async tutorReports(
    tutorId: string,
    q: string,
  ): Promise<SkillResult> {
    try {
      const { items, total } = await this.academic.listReportsPage(15, {
        tutorId,
      });
      const facts = [
        `Reports for focused tutor (GET /sessions/reports?tutorId=): ${total ?? items.length} total, showing ${items.length}.`,
        '',
        '| # | Session | Status | Author | Validated |',
        '| ---: | --- | --- | --- | --- |',
        ...(items.length
          ? items.map((r, i) => reportTableRow(r, i + 1))
          : ['| — | (none) | — | — | — |']),
        '',
        asksTimeline(q)
          ? 'Tutor report timeline = these rows’ createdAt/validatedAt. Dedicated tutor report-history API: ' +
            UNAVAILABLE +
            '.'
          : statusExplanation(),
        nextActionsHint(q),
      ];
      return {
        skillId: this.id,
        ok: true,
        operation: 'tutor_reports',
        data: { tutorId, items, total },
        facts,
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'tutor_reports_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/reports', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async reportsGroupedByAuthor(q: string): Promise<SkillResult> {
    try {
      const { items, total } = await this.academic.listReportsPage(40);
      const counts = new Map<string, number>();
      for (const row of items) {
        const key = (row.authorName || '—').trim() || '—';
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      return {
        skillId: this.id,
        ok: true,
        operation: 'reports_by_tutor_sample',
        data: { total, sampleSize: items.length, byAuthor: Object.fromEntries(ranked) },
        facts: [
          'Reports by tutor — grouped by authorName on a live GET /sessions/reports sample (not a dedicated aggregation endpoint).',
          total != null
            ? `API total reports in scope: ${total}. Sample grouped: ${items.length}.`
            : `Sample grouped: ${items.length} (API total unavailable).`,
          'Filter a named tutor with GET /sessions/reports?tutorId= when the tutor is focused or named.',
          '',
          '| Tutor (author) | Reports in sample |',
          '| --- | ---: |',
          ...(ranked.length
            ? ranked.slice(0, 15).map(([name, n]) => `| ${name} | ${n} |`)
            : ['| (none) | 0 |']),
          '',
          nextActionsHint(q),
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'reports_by_tutor_partial',
        data: null,
        facts: apiPartialFacts('GET /sessions/reports', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async reportsOverview(): Promise<SkillResult> {
    try {
      const [page, kpis] = await Promise.all([
        this.academic.listReportsPage(12).catch(() => ({
          items: [] as ReportRow[],
          total: null as number | null,
        })),
        this.academic.getReportKpis().catch(() => null),
      ]);

      const kpiEntries =
        kpis && typeof kpis === 'object'
          ? Object.entries(kpis)
              .filter(
                ([, v]) => typeof v === 'number' || typeof v === 'string',
              )
              .slice(0, 10)
              .map(([k, v]) => `| ${k} | ${String(v)} |`)
          : [];

      return {
        skillId: this.id,
        ok: true,
        operation: 'reports_overview',
        data: { reports: page.items, total: page.total, kpis },
        facts: [
          'Session reports overview (GET /sessions/reports, authorization-scoped):',
          page.total != null ? `Total in scope: ${page.total}.` : '',
          '',
          '| # | Session | Status | Author | Validated |',
          '| ---: | --- | --- | --- | --- |',
          ...(page.items.length
            ? page.items.map((r, i) => reportTableRow(r, i + 1))
            : ['| — | (none) | — | — | — |']),
          '',
          '### Report KPIs (GET /sessions/report-kpis)',
          '| Metric | Value |',
          '| --- | ---: |',
          ...(kpiEntries.length ? kpiEntries : ['| (unavailable) | — |']),
          '',
          statusExplanation(),
          'Next action: filter pending validation · open a report · ask about today’s / this week’s reports.',
        ].filter(Boolean),
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'report_needs_context',
        data: null,
        facts: [
          'Could not load reports overview.',
          'Next action: select a student/session/report in Ednov (ApplicationContext) then ask again.',
        ],
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private pageListFilters(): PageListFilters {
    const ctx = RequestContextStore.getApplicationContext();
    const filters = ctx?.filters;
    const statuses: string[] = [];
    if (filters && typeof filters === 'object') {
      const raw = filters.statuses ?? filters.status;
      if (Array.isArray(raw)) {
        for (const s of raw) {
          if (typeof s === 'string' && s.trim()) statuses.push(s.trim());
        }
      } else if (typeof raw === 'string' && raw.trim()) {
        statuses.push(raw.trim());
      }
    }
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    if (ctx?.date?.start) dateFrom = ctx.date.start;
    if (ctx?.date?.end) dateTo = ctx.date.end;
    if (filters && typeof filters === 'object') {
      if (typeof filters.dateFrom === 'string') dateFrom = filters.dateFrom;
      if (typeof filters.dateTo === 'string') dateTo = filters.dateTo;
    }
    const search =
      (typeof ctx?.search === 'string' && ctx.search.trim()) ||
      (filters &&
      typeof filters === 'object' &&
      typeof filters.search === 'string'
        ? filters.search.trim()
        : '') ||
      undefined;
    return { statuses, dateFrom, dateTo, search };
  }

  private resolveDateParams(
    q: string,
    page: PageListFilters,
  ): { dateFrom?: string; dateTo?: string } {
    if (page.dateFrom || page.dateTo) {
      return { dateFrom: page.dateFrom, dateTo: page.dateTo };
    }
    const today = isoDate(new Date());
    if (asksToday(q)) {
      return { dateFrom: today, dateTo: today };
    }
    if (asksThisWeek(q)) {
      const { start, end } = weekRange(new Date());
      return { dateFrom: start, dateTo: end };
    }
    return {};
  }
}

type PageListFilters = {
  statuses: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

function num(v: unknown): string {
  return typeof v === 'number' ? String(v) : '—';
}

function reportLabel(r: ReportRow): string {
  const session = r.sessionDisplayName?.trim() || r.sessionId || 'session';
  return `CR ${r.status ?? '?'} — ${session}`;
}

function reportTableRow(r: ReportRow, index: number): string {
  const validated = r.validatedAt
    ? String(r.validatedAt).slice(0, 10)
    : '—';
  return `| ${index} | ${r.sessionDisplayName || r.sessionId || 'Session'} | ${r.status ?? '—'} | ${r.authorName ?? '—'} | ${validated} |`;
}

function redactReport(r: ReportRow): ReportRow {
  const {
    id,
    sessionId,
    status,
    sessionDisplayName,
    authorName,
    authorId,
    validatedAt,
    validatedByName,
    createdAt,
    updatedAt,
    subject,
  } = r;
  return {
    id,
    sessionId,
    status,
    sessionDisplayName,
    authorName,
    authorId,
    validatedAt,
    validatedByName,
    createdAt,
    updatedAt,
    subject: typeof subject === 'string' ? subject : undefined,
  };
}

function statusExplanation(): string {
  return 'Statuses: to_complete / draft / overdue = à saisir; submitted = pending validation; validated = done. No rejected.';
}

function explanationForStatus(status?: string): string {
  switch (status) {
    case 'submitted':
      return 'Current situation: waiting validation. Next action: validate (volunteer scope) or request corrections in Ednov UI (no reject API).';
    case 'to_complete':
    case 'draft':
      return 'Current situation: incomplete — tutor/author must complete the form. Next action: open report editor or notify coordinator.';
    case 'overdue':
      return 'Current situation: overdue completion. Next action: remind tutor / open report to complete.';
    case 'validated':
      return 'Current situation: validated. Next action: view session / export from Comptes-rendus UI if needed.';
    default:
      return 'Summarize only from the status field above — do not invent workflow steps.';
  }
}

function nextActionsHint(q: string, status?: string): string {
  if (status === 'submitted') {
    return 'Next action: Validate report (Copilot confirmation) · View session · Notify coordinator.';
  }
  if (asksSummary(q)) {
    return 'Next action: Generate summary from the live facts above only — never invent pedagogy content not in the payload.';
  }
  return 'Next action: Open report · View session/student/tutor · Notify coordinator · Generate summary.';
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday–Sunday week containing `d` (local). */
function weekRange(d: Date): { start: string; end: string } {
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfWeek = new Date(startOfToday);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diff);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  return { start: isoDate(startOfWeek), end: isoDate(endOfWeek) };
}

function asksRejected(q: string): boolean {
  return /\b(reject(?:ed)?|refus(?:é|e|er)?|rejet(?:é|e|er)?)\b/i.test(q);
}

function asksRules(q: string): boolean {
  return /\b(rule|rules|règle|regle|règles|regles|how (?:does|do) (?:validation|report)|comment (?:valider|fonctionne)|workflow)\b/i.test(
    q,
  );
}

function asksTimeline(q: string): boolean {
  return /\b(timeline|history|historique|parcours|chronolog)\b/i.test(q);
}

function asksKpisOrCount(q: string): boolean {
  return /\b(kpi|indicateurs?|how many|combien|count|nombre|stats?|statistiques?)\b/i.test(
    q,
  );
}

function asksCountWaitingValidation(q: string): boolean {
  return /\b(waiting|attente|pending).{0,20}(valid)|combien.{0,30}(valid)|count.{0,20}(valid)/i.test(
    q,
  );
}

function asksMissing(q: string): boolean {
  return /\b(missing|manquant|manquants|sans compte.?rendu|not submitted|pas (?:encore )?soumis|non soumis)\b/i.test(
    q,
  );
}

function asksPendingValidation(q: string): boolean {
  return (
    /\b(pending validation|en attente de validation|à valider|a valider|waiting validation|submittedPendingValidation)\b/i.test(
      q,
    ) ||
    (/\b(submitted|soumis)\b/i.test(q) && /\b(valid)/i.test(q)) ||
    (/\b(compte.?rendu|comptes?-?rendus?|reports?|rapports?)\b/i.test(q) &&
      /\b(en attente|pending|à valider|a valider)\b/i.test(q) &&
      !/\b(à saisir|a saisir|to_complete|draft|brouillon)\b/i.test(q))
  );
}

function asksValidated(q: string): boolean {
  return /\b(validated|validés|valides|déjà validé|deja valide)\b/i.test(q);
}

function asksPendingSaisie(q: string): boolean {
  return /\b(à saisir|a saisir|to_complete|pendingReports|pending reports?|rapports? en attente|brouillon|draft|overdue|en retard)\b/i.test(
    q,
  );
}

function asksTutorsNeedComplete(q: string): boolean {
  return /\b(tutor|tuteur).{0,40}(complete|compléter|completer|finir|finirir|saisir)|(?:still|encore).{0,20}(complete|compléter|completer|saisir)/i.test(
    q,
  );
}

function asksToday(q: string): boolean {
  return /\b(today|aujourd'?hui)\b/i.test(q);
}

function asksThisWeek(q: string): boolean {
  return /\b(this week|cette semaine|semaine)\b/i.test(q);
}

function asksTodayOrWeek(q: string): boolean {
  return asksToday(q) || asksThisWeek(q);
}

function asksListByStatus(q: string): boolean {
  return (
    asksPendingValidation(q) ||
    asksValidated(q) ||
    asksPendingSaisie(q) ||
    asksMissing(q)
  );
}

function asksStudentScoped(q: string): boolean {
  return /\b(student|élève|eleve|for this|pour (?:cet |cette )?|ce compte.?rendu)\b/i.test(
    q,
  );
}

function asksByTutor(q: string): boolean {
  return /\b(by tutor|par tuteur|reports? (?:of|for|du|des) (?:the )?tutors?|rapports? (?:du|des|par) tuteurs?)\b/i.test(
    q,
  );
}

function asksByStudent(q: string): boolean {
  return /\b(by student|par élève|par eleve|reports? (?:of|for) (?:the )?students?|rapports? (?:de l['’]élève|par élèves?|par eleves?))\b/i.test(
    q,
  );
}

function asksSummary(q: string): boolean {
  return /\b(summar(?:y|ize)|résum(?:é|e|er)|resume|générer|generer)\b/i.test(
    q,
  );
}
