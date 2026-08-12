import { Injectable } from '@nestjs/common';

import { AcademicAdapter, ListSessionsQuery } from '../../integration/adapters/academic.adapter';
import {
  DashboardAdapter,
  todayIso,
  toIsoDate,
} from '../../integration/adapters/dashboard.adapter';
import { UserAdapter } from '../../integration/adapters/user.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import { answerFacts, apiPartialFacts, displayName, safeErrorMessage } from '../skill.utils';
import { collectWarnings, softCall } from '../skill-resilience';

@Injectable()
export class SessionSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'session';
  readonly domains = [
    /\b(session|sessions|séance|seance|séances|seances|class meeting)\b/i,
    /\b(today['’]?s?\s+sessions?|séances?\s+d['’]aujourd|seances?\s+d['’]aujourd|upcoming sessions?|séances?\s+à\s+venir|next session|prochaine séance|prochaine seance|last session|dernière séance)\b/i,
    /\b(particip|who (is|are) in|qui (participe|sont)|cancelled sessions|séances? annul)\b/i,
  ];
  readonly domainTags = ['session', 'academic'];
  readonly capabilities: SkillCapability[] = [
    'count',
    'list',
    'status',
    'search',
  ];

  constructor(
    private readonly academic: AcademicAdapter,
    private readonly dashboard: DashboardAdapter,
    private readonly aggregations: SkillAggregationService,
    private readonly users: UserAdapter,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const q = ctx.question;

      if (
        /\b(cr[ée]er?|crée|cree|create|planifi(?:er|e)|ajouter|nouvelle?)\b.{0,40}\b(s[ée]ance|seance|session)s?\b/i.test(
          q,
        ) ||
        /\b(s[ée]ance|seance|session)s?\b.{0,20}\b(cr[ée]er?|crée|cree|create|planifi(?:er|e))\b/i.test(
          q,
        )
      ) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'create_session_handoff',
          data: null,
          facts: [
            'INTENT: créer une séance — ne pas répondre « pas trouvé dans les documents ».',
            'Guidage FR: page Gestion des Séances → bouton « Créer une séance » / « Planification des séances » → Individuel ou Collectif → établissement, date, horaires, type, matière(s), tuteur/VSC + élève → Valider.',
            'Le formulaire natif Ednov est le chemin recommandé pour créer une séance.',
          ],
        };
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const focusedId = this.academic.resolveFocusedSessionId();
      const filter = inferSessionFilter(q);
      const wantsParticipants = asksParticipants(q);
      const wantsNext = asksNext(q);
      const wantsLast = asksLast(q);

      if (wantsParticipants) {
        return this.participantsForQuestion(q, focusedId, filter, wantsNext);
      }

      if (wantsNext || wantsLast) {
        return this.nextOrLastSession(wantsLast ? 'last' : 'next');
      }

      if (filter) {
        return this.listFiltered(q, filter, isStaffRole(ctx.user.role) ? 20 : 10);
      }

      if (/\b(how many|combien|count|nombre)\b/i.test(q)) {
        try {
          const stats = await this.dashboard.getStats();
          const fromDashboard =
            typeof stats.sessionsCount === 'number'
              ? stats.sessionsCount
              : null;
          const count = fromDashboard ?? (await this.academic.countSessions());
          return {
            skillId: this.id,
            ok: true,
            operation: 'count_sessions',
            data: { count },
            facts: [`Sessions count (live, authorization-scoped): ${count}.`],
          };
        } catch {
          const count = await this.academic.countSessions();
          return {
            skillId: this.id,
            ok: true,
            operation: 'count_sessions',
            data: { count },
            facts: [`Sessions count (live): ${count}.`],
          };
        }
      }

      if (
        focusedId &&
        /\b(summarize|résume|resume|summary|this session|cette séance|cette seance)\b/i.test(
          q,
        )
      ) {
        const sessionCall = await softCall('GET /sessions/:id', () =>
          this.academic.getSession(focusedId),
        );
        if (!sessionCall.ok || !sessionCall.data) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'summarize_session_partial',
            data: null,
            facts: apiPartialFacts(
              'GET /sessions/:id',
              new Error(sessionCall.warning ?? 'timeout'),
            ),
            warnings: collectWarnings(sessionCall),
          };
        }
        const session = sessionCall.data;
        const people = await this.resolveSessionPeople(focusedId);
        return {
          skillId: this.id,
          ok: true,
          operation: 'summarize_session',
          data: { session, people },
          facts: answerFacts({
            answer: `Focused session: ${session.title || session.name || 'selected session'} (${session.status ?? 'n/a'}) on ${session.sessionDate ?? 'n/a'}.`,
            explanation: 'GET /sessions/:id then GET /sessions/:id/participants; names via Users when missing.',
            reasoning: 'Page selection is confirmed with a live GET. Participant timeout does not drop the session row.',
            next: 'Ask who participates, or open the session in Gestion des Séances.',
            source: 'GET /sessions/:id + GET /sessions/:id/participants',
            extra: [
              `Status: ${session.status ?? 'n/a'}.`,
              `Subject: ${session.subject?.label || session.subject?.name || 'n/a'}.`,
              sessionLocation(session)
                ? `Location: ${sessionLocation(session)}.`
                : 'Location: not on session payload.',
              people.students
                ? `Student(s): ${people.students}.`
                : people.participantWarning
                  ? `PARTIAL: ${people.participantWarning}`
                  : 'Student(s): none listed.',
              people.tutors
                ? `Tutor(s): ${people.tutors}.`
                : 'Tutor(s): none listed or not retrieved.',
            ],
          }),
          warnings: people.warnings.length ? people.warnings : undefined,
        };
      }

      if (
        focusedId &&
        /\b(this|cette|selected|focused|summarize|résume|resume|summary)\b/i.test(
          q,
        )
      ) {
        const session = await this.academic.getSession(focusedId);
        return {
          skillId: this.id,
          ok: true,
          operation: 'focused_session',
          data: session,
          facts: answerFacts({
            answer: `Selected session: ${session.title || session.name || 'session'} (${session.status ?? 'n/a'}) on ${session.sessionDate ?? 'n/a'}.`,
            explanation: 'Resolved from the current page selection (ApplicationContext), then re-fetched via GET /sessions/:id.',
            reasoning: 'Copilot never trusts the page payload alone; live GET confirms status and date.',
            next: 'Ask who participates, or open the session in Gestion des Séances.',
            source: 'GET /sessions/:id',
          }),
        };
      }

      const limit = isStaffRole(ctx.user.role) ? 15 : 10;
      const page = await this.academic.listSessionsPage({
        limit,
        sortBy: 'sessionDate',
        sortOrder: 'desc',
      });
      return {
        skillId: this.id,
        ok: true,
        operation: isStaffRole(ctx.user.role)
          ? 'list_sessions'
          : 'list_sessions_limited',
        data: page,
        facts: sessionListFacts(
          isStaffRole(ctx.user.role)
            ? 'Sessions (authorization-scoped sample)'
            : 'Upcoming/recent sessions visible to this user',
          page.sessions,
          page.total,
        ),
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts('Sessions', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async nextOrLastSession(kind: 'next' | 'last'): Promise<SkillResult> {
    const today = todayIso();
    const listed = await softCall('GET /sessions', () =>
      this.academic.listSessionsPage({
        limit: 10,
        sortBy: 'sessionDate',
        sortOrder: kind === 'next' ? 'asc' : 'desc',
        ...(kind === 'next'
          ? { dateFrom: today, statuses: ['PLANNED', 'IN_PROGRESS'] }
          : { dateTo: today }),
      }),
    );
    if (!listed.ok || !listed.data) {
      return {
        skillId: this.id,
        ok: true,
        operation: kind === 'next' ? 'next_session_partial' : 'last_session_partial',
        data: null,
        facts: answerFacts({
          answer: `Could not load ${kind} sessions from the live Sessions API right now.`,
          explanation: listed.warning ?? 'GET /sessions failed.',
          reasoning: 'A timeout is not a missing-document case.',
          next: 'Open Gestion des Séances and retry.',
          source: 'GET /sessions',
        }),
        warnings: collectWarnings(listed),
      };
    }
    const page = listed.data;
    const session = page.sessions[0];
    if (!session) {
      return {
        skillId: this.id,
        ok: true,
        operation: kind === 'next' ? 'next_session_empty' : 'last_session_empty',
        data: { total: page.total, sessions: [] },
        facts: answerFacts({
          answer:
            kind === 'next'
              ? 'No upcoming planned/in-progress session in the live list (API returned zero rows).'
              : 'No past session in the live list (API returned zero rows).',
          explanation: `GET /sessions with sort=${kind === 'next' ? 'asc from today' : 'desc until today'}.`,
          next: 'Open Gestion des Séances or widen filters.',
          source: 'GET /sessions',
        }),
      };
    }
    const label = session.title || session.name || 'Session';
    const location = sessionLocation(session);
    const people = await this.resolveSessionPeople(session.id);
    const extra = [
      `Date: ${session.sessionDate ?? 'n/a'} ${session.startTime ?? ''}–${session.endTime ?? ''}`.trim(),
      `Status: ${session.status ?? 'n/a'}.`,
      location ? `Location: ${location}.` : 'Location: not on session payload.',
      people.students
        ? `Student(s): ${people.students}.`
        : people.participantWarning
          ? `PARTIAL: ${people.participantWarning}`
          : 'Student(s): none listed on participants.',
      people.tutors
        ? `Tutor(s): ${people.tutors}.`
        : people.participantWarning
          ? 'Tutor(s): not retrieved (participants call failed).'
          : 'Tutor(s): none listed on participants.',
      ...sessionListFacts(
        kind === 'next' ? 'Upcoming sample' : 'Recent sample',
        page.sessions,
        page.total,
      ),
    ];
    return {
      skillId: this.id,
      ok: true,
      operation: kind === 'next' ? 'next_session' : 'last_session',
      data: { session, total: page.total, people },
      facts: answerFacts({
        answer: `${kind === 'next' ? 'Next' : 'Last'} session: ${label} on ${session.sessionDate ?? 'n/a'} ${session.startTime ?? ''} (${session.status ?? 'n/a'}).`,
        explanation: `GET /sessions then GET /sessions/:id/participants; names resolved via Users when the participant payload has no display name.`,
        reasoning:
          '“Next/last” is the nearest authorized session. If participants time out, the session row is still returned — never a document-not-found refusal.',
        next: 'Open this session, or ask who was present.',
        source: 'GET /sessions + GET /sessions/:id/participants',
        extra,
      }),
      warnings: people.warnings.length ? people.warnings : undefined,
    };
  }

  private async resolveSessionPeople(sessionId: string): Promise<{
    students: string | null;
    tutors: string | null;
    participantWarning?: string;
    warnings: string[];
  }> {
    const raw = await softCall('GET /sessions/:id/participants', () =>
      this.academic.getSessionParticipants(sessionId),
    );
    if (!raw.ok || raw.data == null) {
      return {
        students: null,
        tutors: null,
        participantWarning:
          raw.warning ??
          'Participants could not be retrieved — session details only.',
        warnings: collectWarnings(raw),
      };
    }
    const rows = flattenParticipants(raw.data);
    const students: string[] = [];
    const tutors: string[] = [];
    for (const row of rows.slice(0, 12)) {
      const role = String(row.role ?? row.participantRole ?? '').toLowerCase();
      let name =
        displayName({
          firstName: str(row.firstName) ?? str(nested(row.user, 'firstName')),
          lastName: str(row.lastName) ?? str(nested(row.user, 'lastName')),
          displayName: str(row.displayName) ?? str(nested(row.user, 'displayName')),
        }) || '';
      if (!name || name === 'Unknown') {
        const uid = str(row.userId) ?? str(row.id) ?? str(nested(row.user, 'id'));
        if (uid) {
          const user = await softCall('GET /users/:id', () =>
            this.users.getUserById(uid),
          );
          if (user.ok && user.data) name = displayName(user.data);
        }
      }
      if (!name || name === 'Unknown') continue;
      if (role === 'tutor' || role === 'volunteer') tutors.push(name);
      else students.push(name);
    }
    return {
      students: students.length ? [...new Set(students)].join(', ') : null,
      tutors: tutors.length ? [...new Set(tutors)].join(', ') : null,
      warnings: [],
    };
  }

  private async participantsForQuestion(
    _q: string,
    focusedId: string | undefined,
    filter: SessionFilter | null,
    wantsNext: boolean,
  ): Promise<SkillResult> {
    let sessionId = focusedId;
    let sessionLabel = 'focused session';
    if (!sessionId || wantsNext || filter) {
      const today = todayIso();
      const page = await this.academic.listSessionsPage({
        limit: 1,
        sortBy: 'sessionDate',
        sortOrder: filter?.kind === 'upcoming' || wantsNext ? 'asc' : 'desc',
        ...(filter?.dateFrom ? { dateFrom: filter.dateFrom } : wantsNext ? { dateFrom: today } : {}),
        ...(filter?.dateTo ? { dateTo: filter.dateTo } : {}),
        ...(filter?.statuses?.length
          ? { statuses: filter.statuses }
          : wantsNext
            ? { statuses: ['PLANNED', 'IN_PROGRESS'] }
            : {}),
      });
      sessionId = page.sessions[0]?.id;
      sessionLabel =
        page.sessions[0]?.title ||
        page.sessions[0]?.name ||
        sessionLabel;
    }
    if (!sessionId) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'participants_no_session',
        data: null,
        facts: answerFacts({
          answer: 'No session found to list participants (API returned zero rows).',
          explanation: 'Need a focused session, today’s session, or the next planned session.',
          next: 'Open a session in Gestion des Séances, then ask again.',
          source: 'GET /sessions',
        }),
      };
    }
    const participantsCall = await softCall(
      'GET /sessions/:id/participants',
      () => this.academic.getSessionParticipants(sessionId),
    );
    if (!participantsCall.ok || participantsCall.data == null) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'session_participants_partial',
        data: { sessionId, sessionLabel },
        facts: answerFacts({
          answer: `Session “${sessionLabel}” is identified, but participants could not be retrieved.`,
          explanation:
            participantsCall.warning ??
            'GET /sessions/:id/participants timed out or failed.',
          reasoning:
            'A participant timeout is not a missing-document case — the session row still stands.',
          next: 'Open the session in Gestion des Séances, or retry.',
          source: 'GET /sessions/:id/participants',
        }),
        warnings: collectWarnings(participantsCall),
      };
    }
    const participants = participantsCall.data;
    const rows = Array.isArray(participants)
      ? participants
      : ((participants as { data?: unknown[] })?.data ?? []);
    return {
      skillId: this.id,
      ok: true,
      operation: 'session_participants',
      data: { sessionId, sessionLabel, participants },
      facts: answerFacts({
        answer: `${rows.length} participant(s) on “${sessionLabel}”.`,
        explanation: `GET /sessions/${sessionId}/participants (authorization-scoped).`,
        reasoning: 'Attendance/roles come from session_participants, not from matching pairs.',
        next: 'Open the session to edit participants, or ask who was present.',
        source: 'GET /sessions/:id/participants',
        extra: [
          '| # | Participant | Role | Status |',
          '| ---: | --- | --- | --- |',
          ...(rows.length
            ? rows.slice(0, 20).map((row, i) => {
                const r = row as Record<string, unknown>;
                const user = r.user as Record<string, unknown> | undefined;
                const name =
                  [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
                  String(r.displayName ?? r.name ?? 'Participant');
                return `| ${i + 1} | ${name} | ${String(r.role ?? 'n/a')} | ${String(r.status ?? r.attendanceStatus ?? 'n/a')} |`;
              })
            : ['| — | (none) | — | — |']),
        ],
      }),
    };
  }

  private async listFiltered(
    q: string,
    filter: SessionFilter,
    limit: number,
  ): Promise<SkillResult> {
    const query: ListSessionsQuery = {
      limit,
      sortBy: 'sessionDate',
      sortOrder: filter.kind === 'upcoming' || filter.kind === 'tomorrow' ? 'asc' : 'desc',
      ...(filter.dateFrom ? { dateFrom: filter.dateFrom } : {}),
      ...(filter.dateTo ? { dateTo: filter.dateTo } : {}),
      ...(filter.statuses?.length ? { statuses: filter.statuses } : {}),
    };
    const page = await this.academic.listSessionsPage(query);
    const countOnly = /\b(how many|combien|count|nombre)\b/i.test(q);
    const total = page.total ?? page.sessions.length;
    return {
      skillId: this.id,
      ok: true,
      operation: filter.operation,
      data: { ...page, filter },
      facts: [
        `${filter.label} via GET /sessions` +
          (filter.dateFrom || filter.dateTo
            ? ` dateFrom=${filter.dateFrom ?? '—'} dateTo=${filter.dateTo ?? '—'}`
            : '') +
          (filter.statuses?.length
            ? ` statuses=${filter.statuses.join(',')}`
            : '') +
          '.',
        `API total: ${page.total != null ? page.total : 'unavailable (showing sample length ' + page.sessions.length + ')'}.`,
        ...(countOnly
          ? [`Count: ${total}.`]
          : sessionListFacts(filter.label, page.sessions, page.total)),
      ],
    };
  }
}

type SessionFilter = {
  kind: 'today' | 'tomorrow' | 'cancelled' | 'completed' | 'upcoming';
  operation: string;
  label: string;
  dateFrom?: string;
  dateTo?: string;
  statuses?: string[];
};

function inferSessionFilter(q: string): SessionFilter | null {
  const today = todayIso();
  const tomorrow = toIsoDate(addDays(new Date(), 1));
  const cancelled = asksCancelled(q);
  const completed = asksCompleted(q);
  const todayQ = asksToday(q);
  const tomorrowQ = asksTomorrow(q);
  const upcoming = asksUpcoming(q);

  if (tomorrowQ) {
    return {
      kind: 'tomorrow',
      operation: cancelled
        ? 'list_sessions_tomorrow_cancelled'
        : completed
          ? 'list_sessions_tomorrow_completed'
          : 'list_sessions_tomorrow',
      label: cancelled
        ? 'Cancelled sessions tomorrow'
        : completed
          ? 'Completed sessions tomorrow'
          : 'Tomorrow’s sessions',
      dateFrom: tomorrow,
      dateTo: tomorrow,
      statuses: cancelled
        ? ['CANCELLED']
        : completed
          ? ['COMPLETED', 'CLOSED']
          : undefined,
    };
  }

  if (todayQ) {
    return {
      kind: 'today',
      operation: cancelled
        ? 'list_sessions_today_cancelled'
        : completed
          ? 'list_sessions_today_completed'
          : 'list_sessions_today',
      label: cancelled
        ? 'Cancelled sessions today'
        : completed
          ? 'Completed sessions today'
          : 'Today’s sessions',
      dateFrom: today,
      dateTo: today,
      statuses: cancelled
        ? ['CANCELLED']
        : completed
          ? ['COMPLETED', 'CLOSED']
          : undefined,
    };
  }

  if (cancelled) {
    return {
      kind: 'cancelled',
      operation: 'list_sessions_cancelled',
      label: 'Cancelled sessions',
      statuses: ['CANCELLED'],
    };
  }

  if (completed) {
    return {
      kind: 'completed',
      operation: 'list_sessions_completed',
      label: 'Completed sessions',
      statuses: ['COMPLETED', 'CLOSED'],
    };
  }

  if (upcoming) {
    return {
      kind: 'upcoming',
      operation: 'list_sessions_upcoming',
      label: 'Upcoming sessions',
      dateFrom: today,
      statuses: ['PLANNED', 'IN_PROGRESS'],
    };
  }

  return null;
}

function asksToday(q: string) {
  return /\b(today|aujourd['’]?hui|du jour|cette journée|cette journee)\b/i.test(
    q,
  );
}

function asksTomorrow(q: string) {
  return /\b(tomorrow|demain)\b/i.test(q);
}

function asksCancelled(q: string) {
  return /\b(cancelled|canceled|annul(?:ée|ées|és|es|é|e)?)\b/i.test(q);
}

function asksCompleted(q: string) {
  return /\b(completed|termin(?:ée|ées|és|es|é|e)?|closed|clôtur(?:ée|ées|és|es)?|clotur(?:ée|ées)?)\b/i.test(
    q,
  );
}

function asksUpcoming(q: string) {
  return /\b(upcoming|à venir|a venir|prochaines?|next|planned|planifi(?:ée|ées|és|es)?)\b/i.test(
    q,
  );
}

function asksNext(q: string) {
  return /\b(next session|prochaine séance|prochaine seance|what is the next|quelle est la prochaine|la prochaine séance|la prochaine seance)\b/i.test(
    q,
  );
}

function asksLast(q: string) {
  return /\b(last session|dernière séance|derniere seance|previous session)\b/i.test(
    q,
  );
}

function asksParticipants(q: string) {
  return /\b(particip|who (is|are) in|qui (participe|sont|est dans)|who attended|qui (était|etait|a assisté))\b/i.test(
    q,
  );
}

function addDays(ref: Date, days: number): Date {
  const d = new Date(ref);
  d.setDate(d.getDate() + days);
  return d;
}

function sessionListFacts(
  label: string,
  sessions: Array<{
    title?: string;
    name?: string;
    status?: string;
    sessionDate?: string;
    startTime?: string;
  }>,
  total: number | null,
): string[] {
  return [
    `${label}` +
      (total != null ? ` (API total ${total}` : ` (sample of ${sessions.length}`) +
      `, showing ${sessions.length}):`,
    '',
    '| # | Session | Date | Status |',
    '| ---: | --- | --- | --- |',
    ...(sessions.length
      ? sessions.map(
          (s, i) =>
            `| ${i + 1} | ${s.title || s.name || 'Session'} | ${s.sessionDate ?? '—'} ${s.startTime ?? ''} | ${s.status ?? 'n/a'} |`,
        )
      : ['| — | (none) | — | — |']),
  ];
}

function sessionLocation(session: {
  establishmentId?: string;
  [key: string]: unknown;
}): string | null {
  const rec = session as Record<string, unknown>;
  const nested = rec.location;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  if (nested && typeof nested === 'object') {
    const loc = nested as Record<string, unknown>;
    const label = [loc.name, loc.address, loc.city]
      .filter((v) => typeof v === 'string' && v.trim())
      .join(', ');
    if (label) return label;
  }
  for (const key of ['room', 'address', 'venue', 'place']) {
    const v = rec[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function flattenParticipants(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) {
    return raw.filter((r) => r && typeof r === 'object') as Array<
      Record<string, unknown>
    >;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const inner = obj.data ?? obj.items ?? obj.results ?? obj.participants;
    if (Array.isArray(inner)) {
      return inner.filter((r) => r && typeof r === 'object') as Array<
        Record<string, unknown>
      >;
    }
  }
  return [];
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function nested(obj: unknown, key: string): unknown {
  if (obj && typeof obj === 'object') {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}
