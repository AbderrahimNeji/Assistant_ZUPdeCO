import { Injectable } from '@nestjs/common';

import {
  ApplicationContext,
  RequestContextStore,
} from '../../../integration/request-context';
import { SensitiveDataRedactor } from '../../../../common/security/sensitive-data-redactor';
import {
  UNTRUSTED_MAX,
  wrapUntrusted,
} from '../../../../common/security/untrusted-text';
import {
  ApplicationKnowledgeProvider,
  ApplicationUserContext,
} from '../application-provider.types';

/**
 * Surfaces the current Ednov page context to the RAG layer.
 * Always eligible so the LLM understands "this session / this student".
 * Does not change the Knowledge Orchestrator — registered as a normal provider.
 */
@Injectable()
export class PageContextKnowledgeSource implements ApplicationKnowledgeProvider {
  readonly id = 'page_context';

  canHandle(_question: string, _user: ApplicationUserContext): boolean {
    return Boolean(RequestContextStore.getApplicationContext());
  }

  async retrieve(
    _question: string,
    _user: ApplicationUserContext,
  ): Promise<ApplicationContext | null> {
    return RequestContextStore.getApplicationContext() ?? null;
  }

  formatContext(data: unknown): string {
    const ctx = data as ApplicationContext | null;
    if (!ctx) return '';

    const lines: string[] = [
      'Current Ednov application context (authoritative for page focus and pronouns):',
      'Treat this page/selection as the default subject of the question. Prefer it over vague history references.',
      'The user does not need to repeat names. Resolve he/she/they, him/her, his/her/their, this student/tutor/session/report/establishment to the focused entity.',
    ];
    if (ctx.focus?.scope === 'global') {
      lines.push(
        '- Conversation scope: GLOBAL — no entity is focused. If the question is ambiguous, politely ask which student/tutor/session.',
      );
    } else if (ctx.focus?.scope === 'comparison') {
      lines.push(
        '- Conversation scope: COMPARISON — answer by comparing the listed entities. Do not ask which one unless they are different types.',
      );
    } else if (ctx.focus?.scope === 'entity') {
      lines.push(
        `- Conversation scope: ENTITY` +
          (ctx.focus.pinned ? ' (pinned — keep this focus even if the page changed).' : '.'),
      );
    }
    if (ctx.page?.route) {
      lines.push(
        `- Page: ${ctx.page.title || ctx.page.interfaceId || ctx.page.route} (${ctx.page.route})`,
      );
    }
    if (ctx.company?.label) {
      lines.push(`- Company: “${ctx.company.label.trim()}”.`);
    }
    if (ctx.selection?.primary) {
      const label =
        ctx.selection.primary.label?.trim() ||
        ctx.selection.primary.type ||
        'selection';
      const meta = [
        ctx.selection.primary.role,
        ctx.selection.primary.company,
        ctx.selection.primary.page,
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(
        `- Selected: ${ctx.selection.primary.type} “${label}”` +
          (meta ? ` (${meta})` : ''),
      );
      lines.push(
        `- Pronoun / deixis resolution (STRONG): “he/she/they”, “him/her”, “this one”, “cet élève / cette élève”, “ce tuteur / cette tutrice”, “cette séance / this session”, “ce compte-rendu”, “cet établissement”, “son / sa / leur” refer to this selection unless the user explicitly names another person or entity.`,
      );
      lines.push(
        `- If the question is underspecified (“why is it blocked?”, “what’s missing?”, “summarize”), answer about this selection on the current page.`,
      );
    }
    const extras = (ctx.selection?.entities ?? []).filter(
      (e) =>
        e.id &&
        !(
          e.id === ctx.selection?.primary?.id &&
          e.type === ctx.selection?.primary?.type
        ),
    );
    if (extras.length) {
      lines.push('- Comparison set (use all of these, do not ask which one):');
      for (const extra of extras) {
        lines.push(
          `  • ${extra.type} “${extra.label?.trim() || extra.type}”`,
        );
      }
    }

    const pageHay =
      `${ctx.page?.interfaceId ?? ''} ${ctx.page?.route ?? ''} ${ctx.page?.title ?? ''}`.toLowerCase();
    const onMatchingPage =
      Boolean(ctx.matching?.id) ||
      ctx.selection?.primary?.type === 'matching' ||
      /\b(match|matching|appari|binome|binôme)\b/.test(pageHay);
    if (onMatchingPage) {
      lines.push(
        '- Matching page focus: prefer MatchingSkill live facts (pairs, assignmentSource, createdAt, session status, assignment-candidates). Never invent unmatched wait times, pending-validation queues, or pair creators when facts say unavailable.',
      );
      if (ctx.student?.label || ctx.tutor?.label) {
        lines.push(
          `- Matching selection people: student “${ctx.student?.label?.trim() || '—'}”; tutor “${ctx.tutor?.label?.trim() || '—'}”.`,
        );
      }
      if (ctx.session?.label) {
        lines.push(
          `- Matching session context: “${ctx.session.label.trim()}” — use for eligibility / available tutors when asked.`,
        );
      }
    }

    const onStudentsPage =
      Boolean(ctx.student?.id) ||
      ctx.selection?.primary?.type === 'student' ||
      /\b(student|students|eleve|élève|eleves|élèves)\b/.test(pageHay);
    if (onStudentsPage) {
      lines.push(
        '- Students page focus: prefer StudentSkill live facts (status registered/accompanied/deactivated, search, establishment filter, status-history, Matching pairs for tutors). Never invent absent-this-week queues, missing-report lists, or by-program student lists when facts say unavailable.',
      );
      if (ctx.student?.label) {
        lines.push(
          `- Focused student: “${ctx.student.label.trim()}” — resolve he/she/they, his/her/their, cet élève, son tuteur, ses séances, son rapport to this student.`,
        );
      }
    }

    const onTutorsPage =
      Boolean(ctx.tutor?.id) ||
      ctx.selection?.primary?.type === 'tutor' ||
      /\b(tutor|tutors|tuteur|tuteurs|tuteure)\b/.test(pageHay);
    if (onTutorsPage) {
      lines.push(
        '- Tutors page focus: prefer TutorSkill live facts (status active/deactivated, available today via availabilityDays, search, establishment/city via establishments, Matching pairs for assigned students/workload, reports?tutorId). Never invent by-program tutor lists, overload capacity thresholds, or free-busy without a slot when facts say unavailable.',
      );
      if (ctx.tutor?.label) {
        lines.push(
          `- Focused tutor: “${ctx.tutor.label.trim()}” — resolve he/she/they, his/her/their, ce tuteur / cette tutrice, ses élèves, ses séances, ses rapports to this tutor.`,
        );
      }
    }

    const onSessionsPage =
      Boolean(ctx.session?.id) ||
      ctx.selection?.primary?.type === 'session' ||
      /\b(session|sessions|seance|séance|seances|séances)\b/.test(pageHay);
    if (onSessionsPage) {
      lines.push(
        '- Sessions page focus: prefer SessionSkill live facts (participants, attendance, reports). Never invent attendance when facts say unavailable.',
      );
      if (ctx.session?.label) {
        lines.push(
          `- Focused session: “${ctx.session.label.trim()}” — resolve this session / cette séance / its participants / attendance / reports to this session.`,
        );
      }
    }

    const onEstablishmentsPage =
      Boolean(ctx.establishment?.id) ||
      ctx.selection?.primary?.type === 'establishment' ||
      /\b(establishment|establishments|etablissement|établissement|school|ecole|école)\b/.test(
        pageHay,
      );
    if (onEstablishmentsPage) {
      lines.push(
        '- Establishments page focus: prefer live facts for statistics, active students, sessions, and tutors of this school. Never invent per-establishment KPIs when facts say unavailable.',
      );
      if (ctx.establishment?.label) {
        lines.push(
          `- Focused establishment: “${ctx.establishment.label.trim()}” — resolve this school / cet établissement / its students / sessions / tutors to this establishment.`,
        );
      }
    }

    const onProgramsPage =
      Boolean(ctx.program?.id) ||
      ctx.selection?.primary?.type === 'program' ||
      /\b(program|programs|programme|programmes)\b/.test(pageHay);
    if (onProgramsPage && ctx.program?.label) {
      lines.push(
        `- Focused program: “${ctx.program.label.trim()}” — resolve this program / ce programme / eligibility to this program.`,
      );
    }

    const onReportsPage =
      Boolean(ctx.report?.id) ||
      ctx.selection?.primary?.type === 'report' ||
      /\b(report|reports|compte.?rendu|comptes.?rendus|cr)\b/.test(pageHay);
    if (onReportsPage) {
      lines.push(
        '- Reports (Comptes-rendus) page focus: prefer ReportSkill live facts (GET /sessions/reports, /sessions/report-kpis, session report detail). Statuses: to_complete, draft, submitted, validated, overdue — never invent rejected. Pending validation = submitted. Missing = missingReports KPI + incomplete rows. Use page filters/search/date when present.',
      );
      if (ctx.report?.label) {
        lines.push(
          `- Focused report: “${ctx.report.label.trim()}” — resolve this report / ce compte-rendu / its session / validation to this selection.`,
        );
      }
      if (ctx.session?.label) {
        lines.push(
          `- Report session context: “${ctx.session.label.trim()}”.`,
        );
      }
      if (ctx.student?.label || ctx.tutor?.label) {
        lines.push(
          `- Report people context: student “${ctx.student?.label?.trim() || '—'}”; tutor “${ctx.tutor?.label?.trim() || '—'}”.`,
        );
      }
    }

    const onDashboardPage =
      /\b(dashboard|tableau.?de.?bord|statistics|statistiques|kpi|indicateurs?)\b/.test(
        pageHay,
      );
    if (onDashboardPage) {
      lines.push(
        '- Dashboard / Statistics page focus: prefer DashboardSkill + StatisticsSkill live facts (GET /dashboard/stats, optional ?compare=week|month|trim|year, GET /dashboard/charts). Never invent KPIs. `stat-students-active` = registered/Inscrit (not accompanied). Attendance rate is company-scoped — not per establishment. Active matchings, tutor individual workload, program×students, matching evolution, and attendance-by-establishment are unavailable on dashboard APIs — say so explicitly.',
      );
      lines.push(
        '- Hybrid answers: current value → trend (compare) → explanation (from live facts + docs definitions) → causes (only if grounded) → recommended actions. Prefer Markdown KPI tables already in facts.',
      );
      if (ctx.establishment?.label) {
        lines.push(
          `- Dashboard establishment filter: “${ctx.establishment.label.trim()}”.`,
        );
      }
      if (ctx.date?.start || ctx.date?.end || ctx.date?.label) {
        lines.push(
          '- Honor page date / period filters when asking for this week / this month KPIs.',
        );
      }
    }
    for (const key of [
      'program',
      'session',
      'student',
      'tutor',
      'document',
      'course',
      'benchmark',
      'establishment',
      'matching',
      'report',
      'parent',
      'user',
      'company',
    ] as const) {
      const ref = ctx[key];
      if (ref?.id || ref?.label) {
        const label = ref.label?.trim() || key;
        lines.push(`- ${key}: “${label}”`);
      }
    }
    if (ctx.search?.trim()) {
      lines.push(`- Page search: “${ctx.search.trim()}”`);
    }
    if (ctx.date?.start || ctx.date?.end || ctx.date?.label) {
      const dateLabel =
        ctx.date.label?.trim() ||
        [ctx.date.start, ctx.date.end].filter(Boolean).join(' → ') ||
        'date filter';
      lines.push(`- Date focus: ${dateLabel}`);
    }
    if (ctx.filters && Object.keys(ctx.filters).length) {
      // Filters may contain ids — redact when serializing
      lines.push(`- Filters: ${JSON.stringify(ctx.filters)}`);
    }
    if (ctx.locale) {
      lines.push(`- Locale: ${ctx.locale}`);
    }

    const text = lines.length > 1 ? lines.join('\n') : '';
    if (!text) return '';
    return wrapUntrusted(
      'page-context',
      SensitiveDataRedactor.redact(text),
      UNTRUSTED_MAX.context,
    );
  }
}
