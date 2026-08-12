import { Injectable } from '@nestjs/common';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { CalendarAdapter } from '../../integration/adapters/calendar.adapter';
import { DashboardAdapter } from '../../integration/adapters/dashboard.adapter';
import { GamificationAdapter } from '../../integration/adapters/gamification.adapter';
import { MatchingAdapter } from '../../integration/adapters/matching.adapter';
import { NotificationAdapter } from '../../integration/adapters/notification.adapter';
import { RegistrationAdapter } from '../../integration/adapters/registration.adapter';
import { ResourceAdapter } from '../../integration/adapters/resource.adapter';
import { SettingsAdapter } from '../../integration/adapters/settings.adapter';
import { UserAdapter } from '../../integration/adapters/user.adapter';
import {
  BusinessSkillId,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { displayName, safeErrorMessage } from '../skill.utils';
import {
  AggregationBucket,
  AggregationIntent,
  addToBucket,
  formatBucketTable,
  formatNumericStats,
  numericStats,
  parseAggregationIntent,
  rankBuckets,
} from './aggregation.engine';

const EST_CAP = 40;
const PAGE_CAP = 3;

/**
 * Catalog-driven aggregations for existing Business Skills.
 * Uses Ednov REST (user bearer) — never queries Supabase from the Assistant.
 */
@Injectable()
export class SkillAggregationService {
  constructor(
    private readonly users: UserAdapter,
    private readonly academic: AcademicAdapter,
    private readonly matching: MatchingAdapter,
    private readonly dashboard: DashboardAdapter,
    private readonly calendar: CalendarAdapter,
    private readonly notifications: NotificationAdapter,
    private readonly registrations: RegistrationAdapter,
    private readonly gamification: GamificationAdapter,
    private readonly resources: ResourceAdapter,
    private readonly settings: SettingsAdapter,
  ) {}

  async tryHandle(
    skillId: BusinessSkillId,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult | null> {
    const intent = parseAggregationIntent(ctx.question);
    if (!intent) return null;
    if (skillId === 'user') return null;
    if (skillId === 'session' && intent.dimension === 'session') return null;
    if (skillId === 'student' && intent.dimension === 'tutor') return null;
    if (skillId === 'tutor' && intent.dimension === 'student' && /report/i.test(ctx.question)) {
      return null;
    }

    try {
      switch (skillId) {
        case 'student':
          return await this.students(intent, ctx);
        case 'tutor':
          return await this.tutors(intent, ctx);
        case 'session':
          return await this.sessions(intent, ctx);
        case 'report':
          return await this.reports(intent, ctx);
        case 'matching':
          return await this.matchingStats(intent, ctx);
        case 'attendance':
          return await this.attendance(intent, ctx);
        case 'establishment':
        case 'dashboard':
        case 'statistics':
          if (intent.dimension === 'program') {
            return await this.programs(intent, ctx);
          }
          return await this.establishmentBundle(intent, skillId, ctx);
        case 'program':
          return await this.programs(intent, ctx);
        case 'registration':
          return await this.participants(intent, ctx);
        case 'calendar':
          return await this.calendarAgg(intent, ctx);
        case 'notification':
          return await this.notificationAgg(ctx);
        case 'parent':
          return await this.parents(ctx);
        case 'gamification':
          return await this.gamificationAgg(intent, ctx);
        case 'vsc-report':
          return await this.vsc(intent, ctx);
        case 'binome':
          return await this.binomes(intent, ctx);
        case 'onboarding':
          return this.onboardingGap();
        case 'document':
          return await this.documents(ctx);
        case 'configuration':
          return await this.configuration(ctx);
        default:
          return null;
      }
    } catch (error) {
      return {
        skillId,
        ok: false,
        operation: 'aggregation_error',
        data: null,
        facts: ['Live aggregation failed — do not invent totals.'],
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async students(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const facts: string[] = [
      'Student aggregations from GET /users/students (authorization-scoped). Schema: users + user_establishments.',
    ];
    const dim = intent.dimension;

    if (dim === 'program') {
      return {
        skillId: 'student',
        ok: true,
        operation: 'agg_students_by_program_unavailable',
        data: null,
        facts: [
          'Students GROUP BY program: GET /users/students has no programId filter and the list payload does not expose user_programs.',
          'Schema has user_programs (user_id → programs) but no REST aggregation endpoint.',
          'Do not invent a program census.',
        ],
      };
    }

    if (dim === 'establishment' || intent.statistics) {
      const grouped = await this.countByEstablishment('students');
      facts.push(
        ...formatBucketTable(
          'COUNT students GROUP BY establishment (API total per establishmentId)',
          rankBuckets(grouped.buckets, intent.topN ?? (intent.ranking ? 10 : null)),
        ),
      );
      if (grouped.truncated) {
        facts.push(`Establishments scanned: ${grouped.scanned} (cap ${EST_CAP}).`);
      }
    }

    if (dim === 'status' || intent.statistics) {
      const [registered, accompanied, deactivated] = await Promise.all([
        this.users.countStudents(['registered']),
        this.users.countStudents(['accompanied']),
        this.users.countStudents(['deactivated']),
      ]);
      const buckets = new Map<string, AggregationBucket>();
      addN(buckets, 'registered', 'registered (Inscrit)', registered);
      addN(buckets, 'accompanied', 'accompanied (Accompagné)', accompanied);
      addN(buckets, 'deactivated', 'deactivated (Désactivé)', deactivated);
      facts.push(
        '',
        ...formatBucketTable('COUNT students GROUP BY status', rankBuckets(buckets, null)),
      );
    }

    const sample = await this.collectStudents();
    const present = sample.rows
      .map((s) => s.presentSessionCount)
      .filter((n): n is number => typeof n === 'number');
    const stats = numericStats(present);
    if (stats && (intent.ops.some((o) => o !== 'count') || intent.statistics || dim === 'student')) {
      facts.push(
        '',
        ...formatNumericStats(
          `presentSessionCount on student sample (${sample.rows.length}` +
            (sample.total != null ? `, API total ${sample.total}` : '') +
            ')',
          stats,
        ),
      );
    }

    if (intent.ranking || dim === 'student') {
      const ranked = [...sample.rows]
        .filter((s) => typeof s.presentSessionCount === 'number')
        .sort((a, b) => (b.presentSessionCount ?? 0) - (a.presentSessionCount ?? 0))
        .slice(0, intent.topN ?? 10);
      facts.push(
        '',
        'TOP students by presentSessionCount (live sample):',
        '| Rank | Student | Sessions present |',
        '| ---: | --- | ---: |',
        ...(ranked.length
          ? ranked.map(
              (s, i) =>
                `| ${i + 1} | ${displayName(s)} | ${s.presentSessionCount ?? 0} |`,
            )
          : ['| — | (no presentSessionCount on payload) | — |']),
      );
    }

    if (facts.length < 2) {
      const total = await this.users.countStudents();
      facts.push(`COUNT students (API total): ${total}.`);
    }

    return ok('student', 'agg_students', { intent }, facts, ctx);
  }

  private async tutors(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const facts: string[] = [
      'Tutor aggregations from GET /users/tutors + matching pairs. Schema: users + user_establishments.',
    ];
    const dim = intent.dimension;

    if (dim === 'establishment' || intent.statistics) {
      const grouped = await this.countByEstablishment('tutors');
      facts.push(
        ...formatBucketTable(
          'COUNT tutors GROUP BY establishment',
          rankBuckets(grouped.buckets, intent.topN ?? (intent.ranking ? 10 : null)),
        ),
      );
    }

    if (dim === 'status' || intent.statistics) {
      const [active, deactivated] = await Promise.all([
        this.users.countTutors(['active']),
        this.users.countTutors(['deactivated']),
      ]);
      const buckets = new Map<string, AggregationBucket>();
      addN(buckets, 'active', 'active', active);
      addN(buckets, 'deactivated', 'deactivated', deactivated);
      facts.push('', ...formatBucketTable('COUNT tutors GROUP BY status', rankBuckets(buckets, null)));
    }

    if (intent.ranking || dim === 'tutor' || intent.statistics) {
      const pairs = await this.collectPairs();
      const byTutor = new Map<string, AggregationBucket>();
      for (const p of pairs.rows) {
        const id = p.tutorUserId || p.tutor?.id || '—';
        const label =
          [p.tutor?.firstName, p.tutor?.lastName].filter(Boolean).join(' ') ||
          p.tutor?.displayName ||
          id;
        addToBucket(byTutor, id, label, p.sessionCount);
      }
      facts.push(
        '',
        ...formatBucketTable(
          'TOP tutors by matching pair COUNT (session_student_tutor_pairs sample)',
          rankBuckets(byTutor, intent.topN ?? 10),
          'Pairs',
        ),
      );
      const sessionCounts = pairs.rows
        .map((p) => p.sessionCount)
        .filter((n): n is number => typeof n === 'number');
      const st = numericStats(sessionCounts);
      if (st) {
        facts.push('', ...formatNumericStats('Pair sessionCount', st));
      }
    }

    if (facts.length < 2) {
      facts.push(`COUNT tutors (API total): ${await this.users.countTutors()}.`);
    }

    return ok('tutor', 'agg_tutors', { intent }, facts, ctx);
  }

  private async sessions(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const facts: string[] = [
      'Session aggregations from GET /sessions. Schema: sessions.establishment_id, sessions.status, sessions.program_id.',
    ];
    const dim = intent.dimension;

    if (dim === 'establishment' || intent.statistics || intent.ranking) {
      const grouped = await this.countByEstablishment('sessions');
      facts.push(
        ...formatBucketTable(
          'COUNT sessions GROUP BY establishment',
          rankBuckets(grouped.buckets, intent.topN ?? (intent.ranking ? 10 : null)),
        ),
      );
    }

    const sample = await this.collectSessions();
    if (dim === 'status' || intent.statistics) {
      const buckets = new Map<string, AggregationBucket>();
      for (const s of sample.rows) {
        addToBucket(buckets, s.status || '—', s.status || '—');
      }
      facts.push(
        '',
        ...formatBucketTable(
          `COUNT sessions GROUP BY status (sample ${sample.rows.length}` +
            (sample.total != null ? `, API total ${sample.total}` : '') +
            ')',
          rankBuckets(buckets, null),
        ),
      );
    }

    if (dim === 'program' || intent.statistics) {
      const buckets = new Map<string, AggregationBucket>();
      for (const s of sample.rows) {
        const id = s.program?.id || s.program?.label || s.program?.name || '';
        const label = s.program?.label || s.program?.name || id || '—';
        if (!id && !s.program) {
          addToBucket(buckets, '—', '(program not on payload)');
        } else {
          addToBucket(buckets, id || label, label);
        }
      }
      facts.push(
        '',
        ...formatBucketTable(
          'COUNT sessions GROUP BY program (from session payload)',
          rankBuckets(buckets, intent.topN ?? 10),
        ),
      );
    }

    if (facts.length < 2) {
      facts.push(`COUNT sessions (API total): ${await this.academic.countSessions()}.`);
    }

    return ok('session', 'agg_sessions', { intent, total: sample.total }, facts, ctx);
  }

  private async reports(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const sample = await this.collectReports();
    const facts: string[] = [
      'Report aggregations from GET /sessions/reports. Schema: session_reports (session_id, author_id, status).',
      sample.total != null
        ? `API total reports: ${sample.total}. Sample: ${sample.rows.length}.`
        : `Sample: ${sample.rows.length}.`,
    ];
    const dim = intent.dimension;

    if (dim === 'tutor' || intent.statistics || intent.ranking) {
      const buckets = new Map<string, AggregationBucket>();
      for (const r of sample.rows) {
        const id = String(r.authorId || r.authorName || '—');
        addToBucket(buckets, id, String(r.authorName || id));
      }
      facts.push(
        '',
        ...formatBucketTable(
          'COUNT reports GROUP BY tutor (authorName)',
          rankBuckets(buckets, intent.topN ?? 10),
        ),
      );
    }

    if (dim === 'session' || intent.statistics) {
      const buckets = new Map<string, AggregationBucket>();
      for (const r of sample.rows) {
        const id = String(r.sessionId || '—');
        addToBucket(buckets, id, String(r.sessionDisplayName || id));
      }
      facts.push(
        '',
        ...formatBucketTable(
          'COUNT reports GROUP BY session',
          rankBuckets(buckets, intent.topN ?? 10),
        ),
      );
    }

    if (dim === 'status' || intent.statistics || !dim) {
      const buckets = new Map<string, AggregationBucket>();
      for (const r of sample.rows) {
        addToBucket(buckets, String(r.status || '—'), String(r.status || '—'));
      }
      facts.push(
        '',
        ...formatBucketTable('COUNT reports GROUP BY status', rankBuckets(buckets, null)),
      );
    }

    return ok('report', 'agg_reports', { intent, total: sample.total }, facts, ctx);
  }

  private async matchingStats(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const sample = await this.collectPairs();
    const facts: string[] = [
      'Matching aggregations from GET /sessions/student-tutor-pairs. Schema: session_student_tutor_pairs.',
      sample.total != null
        ? `API total pairs: ${sample.total}. Sample: ${sample.rows.length}.`
        : `Sample: ${sample.rows.length}.`,
    ];

    const byEst = new Map<string, AggregationBucket>();
    const bySource = new Map<string, AggregationBucket>();
    const byTutor = new Map<string, AggregationBucket>();
    const students = new Set<string>();
    const tutors = new Set<string>();
    const sessionCounts: number[] = [];

    for (const p of sample.rows) {
      const est =
        p.session?.establishment?.name || p.session?.establishment?.id || '—';
      addToBucket(byEst, p.session?.establishment?.id || est, est);
      addToBucket(bySource, p.assignmentSource || '—', p.assignmentSource || '—');
      const tid = p.tutorUserId || p.tutor?.id || '—';
      const tlabel =
        [p.tutor?.firstName, p.tutor?.lastName].filter(Boolean).join(' ') || tid;
      addToBucket(byTutor, tid, tlabel, p.sessionCount);
      if (p.studentUserId) students.add(p.studentUserId);
      if (p.tutorUserId) tutors.add(p.tutorUserId);
      if (typeof p.sessionCount === 'number') sessionCounts.push(p.sessionCount);
    }

    facts.push(
      `Distinct students in sample: ${students.size}. Distinct tutors: ${tutors.size}.`,
      '',
      ...formatBucketTable(
        'COUNT pairs GROUP BY establishment',
        rankBuckets(byEst, intent.topN ?? 10),
      ),
      '',
      ...formatBucketTable('COUNT pairs GROUP BY assignment_source', rankBuckets(bySource, null)),
      '',
      ...formatBucketTable(
        'TOP tutors by pair COUNT',
        rankBuckets(byTutor, intent.topN ?? 10),
        'Pairs',
      ),
    );
    const st = numericStats(sessionCounts);
    if (st) {
      facts.push('', ...formatNumericStats('sessionCount on pairs', st));
    }

    return ok('matching', 'agg_matching', { intent, total: sample.total }, facts, ctx);
  }

  private async attendance(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const facts: string[] = [
      'Attendance aggregations. Schema: session_participants.attendance_status, session_presence_events; company rate from dashboard.',
    ];
    const dash = await this.dashboard.getStats().catch(() => null);
    if (dash) {
      const kpis = this.dashboard.extractNumericKpis(dash);
      const rate = kpis['stat-attendance-rate'];
      if (rate != null) {
        facts.push(`AVG/company attendance rate (stat-attendance-rate): ${rate}%.`);
      }
    }

    const history = await this.academic.getAttendanceHistory(100).catch(() => null);
    const rows = asRows(history);
    const buckets = new Map<string, AggregationBucket>();
    for (const row of rows) {
      const status = String(
        row.attendanceStatus ?? row.status ?? row.presence ?? '—',
      );
      addToBucket(buckets, status, status);
    }
    if (buckets.size) {
      facts.push(
        '',
        ...formatBucketTable(
          `COUNT attendance-history rows GROUP BY status (n=${rows.length})`,
          rankBuckets(buckets, intent.topN),
        ),
      );
    } else {
      facts.push(
        'Attendance-history rows had no status field to GROUP BY — company rate above is the live KPI.',
      );
    }

    const sessionId = this.academic.resolveFocusedSessionId();
    if (sessionId) {
      const participants = await this.academic
        .getSessionParticipants(sessionId)
        .catch(() => null);
      const people = asRows(participants);
      const byStatus = new Map<string, AggregationBucket>();
      for (const p of people) {
        const status = String(p.attendanceStatus ?? p.status ?? '—');
        addToBucket(byStatus, status, status);
      }
      if (byStatus.size) {
        facts.push(
          '',
          ...formatBucketTable(
            'Focused session COUNT participants GROUP BY attendance_status',
            rankBuckets(byStatus, null),
          ),
        );
      }
    }

    return ok('attendance', 'agg_attendance', { intent }, facts, ctx);
  }

  private async establishmentBundle(
    intent: AggregationIntent,
    skillId: BusinessSkillId,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const facts: string[] = [
      'Establishment rankings from live COUNTs (students/tutors/sessions per establishmentId) plus GET /dashboard/charts.',
    ];
    const [students, tutors, sessions, charts] = await Promise.all([
      this.countByEstablishment('students'),
      this.countByEstablishment('tutors'),
      this.countByEstablishment('sessions'),
      this.dashboard.getCharts().catch(() => null),
    ]);
    const top = intent.topN ?? 10;
    const least = /\b(least|moins|pire|worst|lowest)\b/i.test(ctx.question);

    facts.push(
      '',
      ...formatBucketTable(
        'COUNT students GROUP BY establishment',
        rankBuckets(students.buckets, top, least),
      ),
      '',
      ...formatBucketTable(
        'COUNT tutors GROUP BY establishment',
        rankBuckets(tutors.buckets, top, least),
      ),
      '',
      ...formatBucketTable(
        'COUNT sessions GROUP BY establishment',
        rankBuckets(sessions.buckets, top, least),
      ),
    );

    const byCompleted = this.dashboard.bestWorstByCompletedSessions(charts);
    if (byCompleted) {
      facts.push(
        '',
        'Charts ranking — completed sessions (Terminées):',
        `Most active: ${byCompleted.best.establishment} (${byCompleted.best.value}).`,
        `Least in sample: ${byCompleted.worst.establishment} (${byCompleted.worst.value}).`,
      );
    }

    return ok(skillId, 'agg_establishments', { intent }, facts, ctx);
  }

  private async programs(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const facts: string[] = [
      'Program aggregations. Schema: programs; sessions.program_id.',
    ];
    const stats = await this.dashboard.getStats().catch(() => null);
    if (typeof stats?.programsCount === 'number') {
      facts.push(`COUNT programs (dashboard): ${stats.programsCount}.`);
    }
    const sample = await this.collectSessions();
    const buckets = new Map<string, AggregationBucket>();
    for (const s of sample.rows) {
      const label = s.program?.label || s.program?.name || s.program?.id || '—';
      addToBucket(buckets, s.program?.id || label, label);
    }
    facts.push(
      '',
      ...formatBucketTable(
        'COUNT sessions GROUP BY program (session payload sample)',
        rankBuckets(buckets, intent.topN ?? 10),
      ),
    );
    facts.push(
      'Students GROUP BY program: not exposed on GET /users/students (user_programs has no list filter).',
    );
    return ok('program', 'agg_programs', { intent }, facts, ctx);
  }

  private async participants(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const rows = await this.registrations.listForUser(
      ctx.user.userId,
      ctx.user.role,
    );
    const byRole = new Map<string, AggregationBucket>();
    const byAtt = new Map<string, AggregationBucket>();
    for (const r of rows) {
      addToBucket(byRole, r.role || '—', r.role || '—');
      addToBucket(byAtt, r.attendanceStatus || '—', r.attendanceStatus || '—');
    }
    const facts = [
      'Participant aggregations from session participants (schema session_participants). Not user_onboarding_*.',
      `Rows in scope: ${rows.length}.`,
      '',
      ...formatBucketTable('COUNT GROUP BY role', rankBuckets(byRole, null)),
      '',
      ...formatBucketTable(
        'COUNT GROUP BY attendance_status',
        rankBuckets(byAtt, intent.topN),
      ),
    ];
    return ok('registration', 'agg_participants', { intent }, facts, ctx);
  }

  private async calendarAgg(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const rows = await this.calendar.getTimetable(ctx.user.userId);
    const list = Array.isArray(rows) ? rows : [];
    const byType = new Map<string, AggregationBucket>();
    const byEst = new Map<string, AggregationBucket>();
    for (const r of list) {
      addToBucket(byType, r.type || '—', r.type || '—');
      addToBucket(byEst, r.establishment || '—', r.establishment || '—');
    }
    const facts = [
      'Calendar aggregations from GET /calendar/events (sessions + holidays + post-its).',
      `Events in window: ${list.length}.`,
      '',
      ...formatBucketTable('COUNT GROUP BY type', rankBuckets(byType, null)),
      '',
      ...formatBucketTable(
        'COUNT GROUP BY establishment',
        rankBuckets(byEst, intent.topN ?? 10),
      ),
    ];
    return ok('calendar', 'agg_calendar', { intent }, facts, ctx);
  }

  private async notificationAgg(ctx: SkillExecutionContext): Promise<SkillResult> {
    const payload = await this.notifications.listForUser(ctx.user.userId);
    const unread = await this.notifications.unreadCount();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const facts = [
      'Notification aggregations from GET /notifications. Schema: notifications.',
      `COUNT listed: ${items.length}.`,
      `COUNT unread: ${unread}.`,
    ];
    return ok('notification', 'agg_notifications', { listed: items.length, unread }, facts, ctx);
  }

  private async parents(ctx: SkillExecutionContext): Promise<SkillResult> {
    const sample = await this.collectStudents();
    let withG = 0;
    let without = 0;
    for (const s of sample.rows) {
      const g = s.userProfiles?.[0]?.guardianContact;
      if (g && typeof g === 'object' && Object.keys(g).length) withG += 1;
      else without += 1;
    }
    const facts = [
      'Parent aggregations from user_profiles.guardian_contact on GET /users/students (no parents table).',
      `Sample: ${sample.rows.length}` +
        (sample.total != null ? `, API total ${sample.total}` : '') +
        '.',
      `COUNT students with guardian contact: ${withG}.`,
      `COUNT without guardian contact in sample: ${without}.`,
    ];
    return ok('parent', 'agg_parents', { withG, without }, facts, ctx);
  }

  private async gamificationAgg(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const board = await this.gamification.getLeaderboard(intent.topN ?? 20);
    const entries = board.entries ?? [];
    const xp = entries
      .map((e) => e.totalXp)
      .filter((n): n is number => typeof n === 'number');
    const st = numericStats(xp);
    const facts = [
      'Gamification aggregations from leaderboard API. Schema: gamification_* / tutor_gamification.',
      ...entries.slice(0, intent.topN ?? 10).map(
        (e, i) =>
          `${i + 1}. ${e.displayName || '—'} — XP ${e.totalXp ?? 'n/a'} (rank ${e.rank ?? i + 1})`,
      ),
    ];
    if (st) facts.push('', ...formatNumericStats('Leaderboard totalXp', st));
    return ok('gamification', 'agg_gamification', { intent, entries }, facts, ctx);
  }

  private async vsc(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const page = await this.academic.listVscReports(100);
    const buckets = new Map<string, AggregationBucket>();
    for (const row of page.items) {
      const status = String(row.status ?? '—');
      addToBucket(buckets, status, status);
    }
    const facts = [
      'VSC report aggregations from GET /sessions/vsc-reports. Schema: vsc_reports / vsc_daily_reports.',
      page.total != null ? `API total: ${page.total}.` : `Sample: ${page.items.length}.`,
      '',
      ...formatBucketTable('COUNT GROUP BY status', rankBuckets(buckets, intent.topN)),
    ];
    return ok('vsc-report', 'agg_vsc', { intent, total: page.total }, facts, ctx);
  }

  private async binomes(
    intent: AggregationIntent,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const establishmentId = this.academic.resolveFocusedEstablishmentId();
    const rows = await this.matching.listBinomeCoeur({ establishmentId });
    const list = Array.isArray(rows) ? rows : [];
    const byEst = new Map<string, AggregationBucket>();
    for (const row of list) {
      const rec = row as Record<string, unknown>;
      const est = rec as {
        establishment?: { id?: string; name?: string };
        establishmentId?: string;
        establishmentName?: string;
      };
      const id = est.establishment?.id || est.establishmentId || '—';
      const label =
        est.establishment?.name || est.establishmentName || String(id);
      addToBucket(byEst, String(id), String(label));
    }
    const facts = [
      'Binôme cœur aggregations from GET /companies/:id/binome-coeur. Schema: core_pairs. Table binomes has no REST list.',
      `COUNT core pairs in payload: ${list.length}.`,
      '',
      ...formatBucketTable(
        'COUNT GROUP BY establishment',
        rankBuckets(byEst, intent.topN ?? 10),
      ),
    ];
    return ok('binome', 'agg_binome', { intent, count: list.length }, facts, ctx);
  }

  private onboardingGap(): SkillResult {
    return {
      skillId: 'onboarding',
      ok: true,
      operation: 'agg_onboarding_unavailable',
      data: null,
      facts: [
        'Onboarding aggregations cannot run: schema has user_onboarding_records / step_progress / templates, but Ednov exposes no onboarding REST.',
        'Neither COUNT nor GROUP BY can be computed without inventing numbers.',
      ],
    };
  }

  private async documents(ctx: SkillExecutionContext): Promise<SkillResult> {
    const list = await this.resources.list(50);
    const rows = Array.isArray(list) ? list : asRows(list);
    return ok(
      'document',
      'agg_documents',
      { count: rows.length },
      [
        'Document aggregations from GET /resources. Schema: pedagogical_resources.',
        `COUNT resources in sample: ${rows.length}.`,
      ],
      ctx,
    );
  }

  private async configuration(ctx: SkillExecutionContext): Promise<SkillResult> {
    const flags = await this.settings.getFeatureFlags().catch(() => null);
    const count = flags && typeof flags === 'object' ? Object.keys(flags).length : 0;
    return ok(
      'configuration',
      'agg_configuration',
      { flagCount: count },
      [
        'Configuration aggregations from settings/feature-flags. Schema: company_settings, feature_flags.',
        `COUNT feature flag keys: ${count}.`,
      ],
      ctx,
    );
  }

  private async countByEstablishment(
    kind: 'students' | 'tutors' | 'sessions',
  ): Promise<{
    buckets: Map<string, AggregationBucket>;
    scanned: number;
    truncated: boolean;
  }> {
    const establishments = await this.academic.listEstablishments(100);
    const slice = establishments.slice(0, EST_CAP);
    const buckets = new Map<string, AggregationBucket>();
    await Promise.all(
      slice.map(async (est) => {
        const id = est.id;
        const label = est.name || est.label || id;
        let n = 0;
        if (kind === 'students') {
          const page = await this.users.listStudentsPage({
            limit: 1,
            establishmentId: id,
          });
          n = page.total ?? page.students.length;
        } else if (kind === 'tutors') {
          const page = await this.users.listTutorsPage({
            limit: 1,
            establishmentId: id,
          });
          n = page.total ?? page.tutors.length;
        } else {
          const page = await this.academic.listSessionsPage({
            limit: 1,
            establishmentId: id,
          });
          n = page.total ?? page.sessions.length;
        }
        addN(buckets, id, label, n);
      }),
    );
    return {
      buckets,
      scanned: slice.length,
      truncated: establishments.length > EST_CAP,
    };
  }

  private async collectStudents() {
    const rows: Awaited<ReturnType<UserAdapter['listStudentsPage']>>['students'] =
      [];
    let total: number | null = null;
    for (let page = 1; page <= PAGE_CAP; page++) {
      const r = await this.users.listStudentsPage({ limit: 100, page });
      total = r.total;
      rows.push(...r.students);
      if (r.students.length < 100) break;
    }
    return { rows, total };
  }

  private async collectSessions() {
    const rows: Awaited<ReturnType<AcademicAdapter['listSessionsPage']>>['sessions'] =
      [];
    let total: number | null = null;
    for (let page = 1; page <= PAGE_CAP; page++) {
      const r = await this.academic.listSessionsPage({ limit: 100, page });
      total = r.total;
      rows.push(...r.sessions);
      if (r.sessions.length < 100) break;
    }
    return { rows, total };
  }

  private async collectReports() {
    const rows: Awaited<ReturnType<AcademicAdapter['listReportsPage']>>['items'] =
      [];
    let total: number | null = null;
    for (let page = 1; page <= PAGE_CAP; page++) {
      const r = await this.academic.listReportsPage(100, { page });
      total = r.total;
      rows.push(...r.items);
      if (r.items.length < 100) break;
    }
    return { rows, total };
  }

  private async collectPairs() {
    const rows: Awaited<ReturnType<MatchingAdapter['listPairsPage']>>['pairs'] =
      [];
    let total: number | null = null;
    for (let page = 1; page <= PAGE_CAP; page++) {
      const r = await this.matching.listPairsPage({ page, pageSize: 100 });
      total = r.total;
      rows.push(...r.pairs);
      if (r.pairs.length < 100) break;
    }
    return { rows, total };
  }
}

function addN(
  buckets: Map<string, AggregationBucket>,
  key: string,
  label: string,
  count: number,
) {
  buckets.set(key, { key, label, count, values: [] });
}

function asRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((x) => x && typeof x === 'object') as Record<
      string,
      unknown
    >[];
  }
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    const arr = o.data ?? o.items ?? o.results ?? o.history ?? o.participants;
    if (Array.isArray(arr)) {
      return arr.filter((x) => x && typeof x === 'object') as Record<
        string,
        unknown
      >[];
    }
  }
  return [];
}

function ok(
  skillId: BusinessSkillId,
  operation: string,
  data: unknown,
  facts: string[],
  ctx: SkillExecutionContext,
): SkillResult {
  if (!isStaffRole(ctx.user.role) && ctx.user.role !== undefined) {
    // Callers already gate unauthorized roles; keep facts as-is.
  }
  return { skillId, ok: true, operation, data, facts };
}
