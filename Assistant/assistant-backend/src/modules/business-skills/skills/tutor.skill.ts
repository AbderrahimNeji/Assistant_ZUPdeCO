import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import { DashboardAdapter } from '../../integration/adapters/dashboard.adapter';
import {
  MatchingAdapter,
  StudentTutorPair,
} from '../../integration/adapters/matching.adapter';
import {
  EdnovUserRow,
  TutorListItem,
  UserAdapter,
} from '../../integration/adapters/user.adapter';
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
  active: 'active (Actif)',
  deactivated: 'deactivated (Désactivé)',
};

/**
 * Tutors module live facts — counts, search, lists, focused profile /
 * diagnostics. Uses Ednov /users/tutors (+ Matching pairs, reports when
 * present). Never invents statuses or lists.
 */
@Injectable()
export class TutorSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'tutor';
  readonly domains = [
    /\b(tutor|tutors|tuteur|tuteurs|tuteure|teacher|teachers|professeur|workload|charge de travail|active tutors|tuteurs? actifs?)\b/i,
    /\b(open|ouvre|ouvrir|show|montre|affiche).{0,40}(tutor|tuteur|profil|profile|fiche)\b/i,
  ];
  readonly domainTags = [
    'tutor',
    'teachers',
    'tutor-availability',
    'tutor-workload',
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
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      if (ctx.user.role === UserRole.STUDENT) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'student_scope_note',
          data: null,
          facts: [
            'Student role: tutor listings are limited to what Ednov APIs authorize for this account.',
          ],
        };
      }

      if (!isStaffRole(ctx.user.role) && ctx.user.role !== UserRole.TUTOR) {
        return {
          skillId: this.id,
          ok: false,
          operation: 'unauthorized',
          data: null,
          facts: ['No tutor data authorized for this role.'],
        };
      }

      const q = ctx.question;
      const focusedId =
        this.users.resolveFocusedTutorId() ||
        this.matching.resolveContextTutorId();
      const labelHint =
        ctx.applicationContext?.tutor?.label?.trim() ||
        ctx.applicationContext?.selection?.primary?.label?.trim();
      const search = extractTutorSearch(q);

      if (
        focusedId &&
        (wantsTutorProfile(q, true, search) ||
          asksDeixis(q) ||
          /\b(this tutor|ce tuteur|cette tutrice|cette tuteure)\b/i.test(q))
      ) {
        return this.openTutorProfile(q, focusedId, labelHint, search);
      }

      if (wantsTutorProfile(q, Boolean(focusedId), search)) {
        return this.openTutorProfile(q, focusedId, labelHint, search);
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const establishmentId =
        this.users.resolveEstablishmentFilterId() ||
        this.academic.resolveFocusedEstablishmentId();

      if (asksAvailableToday(q) || asksAvailability(q)) {
        return this.countAvailableToday();
      }

      if (asksCount(q)) {
        return this.countTutors(q, establishmentId);
      }

      if (asksByProgram(q)) {
        return unavailableResult(this.id, 'list_by_program_unavailable', [
          'Tutors by program: ' + UNAVAILABLE,
          'GET /users/tutors has no programId filter.',
          'Next action: open Tutors and filter by establishment / subject, or open Programs.',
        ]);
      }

      if (asksNoAssignedStudents(q)) {
        return this.tutorsWithoutAssignedStudents();
      }

      if (asksOverloaded(q) || asksHighestWorkload(q)) {
        return this.tutorsWorkload(q);
      }

      if (asksNoUpcomingSessions(q)) {
        return this.tutorsNoUpcomingSessions();
      }

      if (asksInactiveList(q)) {
        return this.listByStatus(['deactivated'], establishmentId);
      }

      if (asksByCity(q)) {
        return this.listByCity(q);
      }

      if (asksByEstablishment(q) || (establishmentId && asksList(q))) {
        return this.listByEstablishment(establishmentId, q);
      }

      if (asksActiveList(q)) {
        return this.listByStatus(['active'], establishmentId);
      }

      if (
        search &&
        (asksSearch(q) ||
          /\b(all|tous?)\b/i.test(q) ||
          /\b(sarah|dupont)\b/i.test(search))
      ) {
        return this.searchTutors(search);
      }

      if (focusedId && asksDiagnostic(q)) {
        return this.diagnoseTutor({
          tutorId: focusedId,
          labelHint,
          question: q,
        });
      }

      if (
        focusedId &&
        (asksTimeline(q) ||
          asksProfile(q) ||
          asksDeixis(q) ||
          asksAssignedStudents(q) ||
          asksReports(q) ||
          asksSessions(q))
      ) {
        return this.focusedTutorDetail(focusedId, labelHint, q);
      }

      if (
        focusedId &&
        /\b(this tutor|ce tuteur|cette tutrice|selected tutor|focused tutor)\b/i.test(
          q,
        )
      ) {
        return this.focusedTutorDetail(focusedId, labelHint, q);
      }

      if (search) {
        return this.searchTutors(search);
      }

      if (focusedId) {
        return this.focusedTutorDetail(focusedId, labelHint, q);
      }

      const page = await this.users.listTutorsPage({ limit: 15 });
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_tutors',
        data: { total: page.total, sample: page.tutors.map(summarizeTutor) },
        facts: [
          `Tutors (sample of ${page.tutors.length}` +
            (page.total != null ? `, API total ${page.total}` : '') +
            ', authorization-scoped):',
          '| # | Tutor | Status | Establishment |',
          '| ---: | --- | --- | --- |',
          ...page.tutors.map(
            (t, i) =>
              `| ${i + 1} | ${tutorDisplayName(t)} | ${statusLabel(t.status)} | ${establishmentLabel(t)} |`,
          ),
          'Ask for active counts, available today, without students, workload, inactive, or open a tutor profile.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts('Tutors', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async countTutors(
    q: string,
    establishmentId?: string,
  ): Promise<SkillResult> {
    const wantsActive =
      /\b(active|actifs?|actives?)\b/i.test(q) ||
      !/\b(inactive|inactifs?|deactivated|désactiv)/i.test(q);
    const wantsInactive =
      /\b(inactive|inactifs?|archived|archivés?|deactivated|désactivés?|desactives?)\b/i.test(
        q,
      );

    try {
      const [active, deactivated, total, dash] = await Promise.all([
        this.users.countTutors(['active']),
        this.users.countTutors(['deactivated']),
        this.users.countTutors(),
        this.dashboard.getStats().catch(() => null),
      ]);
      const kpis = dash ? this.dashboard.extractTutorKpis(dash) : null;

      const facts: string[] = [
        'Tutor counts (live, authorization-scoped via GET /users/tutors statuses):',
        '| Metric | Count | Ednov status |',
        '| --- | ---: | --- |',
        `| Active | ${active} | active |`,
        `| Inactive / deactivated | ${deactivated} | deactivated |`,
        `| All tutors (API total) | ${total} | (no status filter) |`,
      ];

      if (kpis?.activeTutors != null) {
        facts.push(
          `Dashboard KPI \`stat-tutors-active\`: ${kpis.activeTutors}.`,
        );
      } else if (dash) {
        facts.push(
          'Dashboard top-level `tutorsCount` / nested `stat-tutors-active`: not present on this stats payload — list API totals above are authoritative.',
        );
      }

      if (wantsActive) {
        facts.push(`Active tutors (status active): ${active}.`);
      }
      if (wantsInactive) {
        facts.push(
          `Inactive / deactivated tutors (status deactivated): ${deactivated}.`,
        );
      }
      if (establishmentId) {
        const estPage = await this.users.listTutorsPage({
          limit: 1,
          establishmentId,
        });
        facts.push(
          estPage.total != null
            ? `Focused establishment filter: ${estPage.total} tutor(s) (authorization-scoped).`
            : 'Focused establishment filter applied; API total unavailable on this response.',
        );
      }
      facts.push(
        'Next action: list inactive tutors, available today, workload, or select a tutor for diagnosis.',
      );

      return {
        skillId: this.id,
        ok: true,
        operation: 'count_tutors_by_status',
        data: {
          active,
          deactivated,
          total,
          dashboardActive: kpis?.activeTutors ?? null,
        },
        facts,
      };
    } catch (error) {
      const count = await this.users.countTutors().catch(() => null);
      return {
        skillId: this.id,
        ok: count != null,
        operation: 'count_tutors_fallback',
        data: { count },
        facts:
          count != null
            ? [`Tutors count (live total only): ${count}.`]
            : ['Could not load tutor counts from Ednov.'],
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async countAvailableToday(): Promise<SkillResult> {
    const day = new Date().getDay(); // 0=Sunday .. 6=Saturday
    try {
      const page = await this.users.listTutorsPage({
        limit: 20,
        statuses: ['active'],
        availabilityDays: [day],
      });
      const dayName = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ][day];
      return {
        skillId: this.id,
        ok: true,
        operation: 'count_available_today',
        data: {
          dayOfWeek: day,
          dayName,
          total: page.total,
          sample: page.tutors.map(summarizeTutor),
        },
        facts: [
          `Tutors with a weekly availability slot on ${dayName} (today, day=${day})` +
            (page.total != null ? `: API total ${page.total}` : '') +
            ' (active status + availabilityDays filter).',
          'This is weekly-slot availability for the weekday — not a live free/busy calendar for a specific hour.',
          'Slot-level conflict check requires GET /sessions/check-tutor-availability with tutorId + date/time (not used for a company-wide “available now” census).',
          page.tutors.length
            ? '| # | Tutor | Establishment |'
            : 'No tutors matched this availability filter in the sample.',
          page.tutors.length ? '| ---: | --- | --- |' : '',
          ...page.tutors.map(
            (t, i) =>
              `| ${i + 1} | ${tutorDisplayName(t)} | ${establishmentLabel(t)} |`,
          ),
          'Next action: open Tutors filters by availability, or select a tutor + session slot for conflict check.',
        ].filter(Boolean),
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'available_today_unavailable',
        data: null,
        facts: [
          'Available tutors today: ' + UNAVAILABLE,
          'Could not apply GET /users/tutors availabilityDays filter.',
          'Do not invent an available-today count.',
        ],
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async searchTutors(name: string): Promise<SkillResult> {
    const hits = await this.users.findTutorsByName(name);
    return {
      skillId: this.id,
      ok: true,
      operation: 'search_tutors',
      data: hits.map(summarizeTutor),
      facts: hits.length
        ? [
            `Found ${hits.length} tutor(s) matching “${name}” (live search):`,
            '| # | Tutor | Status | Establishment | Subjects |',
            '| ---: | --- | --- | --- | --- |',
            ...hits.map(
              (t, i) =>
                `| ${i + 1} | ${tutorDisplayName(t)} | ${statusLabel(t.status)} | ${establishmentLabel(t)} | ${subjectsLabel(t)} |`,
            ),
            'Next action: Open tutor profile, Show assigned students, or Schedule new session.',
          ]
        : [`No tutors found matching “${name}”.`],
    };
  }

  private async listByStatus(
    statuses: string[],
    establishmentId?: string,
  ): Promise<SkillResult> {
    const page = await this.users.listTutorsPage({
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
        tutors: page.tutors.map(summarizeTutor),
      },
      facts: [
        `Tutors with status ${statuses.map((s) => statusLabel(s)).join(', ')}` +
          (page.total != null ? ` (API total ${page.total})` : '') +
          ':',
        '| # | Tutor | Status | Establishment |',
        '| ---: | --- | --- | --- |',
        ...page.tutors.map(
          (t, i) =>
            `| ${i + 1} | ${tutorDisplayName(t)} | ${statusLabel(t.status)} | ${establishmentLabel(t)} |`,
        ),
        page.tutors.length
          ? 'Next action: Open tutor profile or diagnose availability / workload.'
          : 'No tutors in this status filter.',
      ],
    };
  }

  private async listByEstablishment(
    establishmentId: string | undefined,
    q: string,
  ): Promise<SkillResult> {
    if (!establishmentId) {
      return unavailableResult(this.id, 'list_by_establishment_needs_context', [
        'Tutors by establishment need a focused establishment (ApplicationContext filter or selection).',
        'Open Establishments or set the Tutors establishment filter, then ask again.',
        'Listing every establishment breakdown in one call: ' + UNAVAILABLE,
      ]);
    }

    const page = await this.users.listTutorsPage({
      limit: 20,
      establishmentId,
      ...(asksInactiveList(q)
        ? { statuses: ['deactivated'] }
        : asksActiveList(q)
          ? { statuses: ['active'] }
          : {}),
    });
    const estLabel =
      page.tutors[0] != null
        ? establishmentLabel(page.tutors[0])
        : 'focused establishment';

    return {
      skillId: this.id,
      ok: true,
      operation: 'list_by_establishment',
      data: {
        establishmentId: '[redacted]',
        total: page.total,
        sample: page.tutors.map(summarizeTutor),
      },
      facts: [
        `Tutors for establishment “${estLabel}”` +
          (page.total != null ? ` (API total ${page.total})` : '') +
          ':',
        '| # | Tutor | Status |',
        '| ---: | --- | --- |',
        ...page.tutors.map(
          (t, i) =>
            `| ${i + 1} | ${tutorDisplayName(t)} | ${statusLabel(t.status)} |`,
        ),
        'Next action: Open tutor profile or filter further by status / availability.',
      ],
    };
  }

  private async listByCity(q: string): Promise<SkillResult> {
    const city = extractCityName(q);
    if (!city) {
      return unavailableResult(this.id, 'list_by_city_needs_name', [
        'Tutors by city: name a city (e.g. Paris), or focus an establishment.',
        'GET /users/tutors has no city-name filter — only establishmentId(s).',
      ]);
    }

    try {
      const establishments = await this.academic.listEstablishments(20, city);
      const matching = establishments.filter((e) => {
        const hay =
          `${e.name ?? ''} ${e.city ?? ''}`.toLowerCase();
        return hay.includes(city.toLowerCase());
      });
      const ids = matching
        .map((e) => e.id)
        .filter((id): id is string => Boolean(id));

      if (!ids.length) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'list_by_city_no_establishment',
          data: { city, establishments: [] },
          facts: [
            `No establishment matched city/search “${city}” via establishments API.`,
            'GET /users/tutors has no direct city filter — cannot invent tutors from Paris without an establishment id.',
            'Next action: open Establishments, then Tutors with establishment filter.',
          ],
        };
      }

      const page = await this.users.listTutorsPage({
        limit: 20,
        establishmentIds: ids.slice(0, 10),
        statuses: ['active'],
      });

      return {
        skillId: this.id,
        ok: true,
        operation: 'list_by_city_via_establishment',
        data: {
          city,
          establishmentCount: ids.length,
          total: page.total,
          sample: page.tutors.map(summarizeTutor),
        },
        facts: [
          `Tutors linked to establishment(s) matching “${city}” (${ids.length} establishment id(s) resolved)` +
            (page.total != null ? `, API total ${page.total}` : '') +
            ':',
          '| # | Tutor | Status | Establishment |',
          '| ---: | --- | --- | --- |',
          ...page.tutors.map(
            (t, i) =>
              `| ${i + 1} | ${tutorDisplayName(t)} | ${statusLabel(t.status)} | ${establishmentLabel(t)} |`,
          ),
          'Resolved via establishments search → establishmentIds on GET /users/tutors (no native city filter on tutors).',
          'Next action: Open tutor profile or narrow by a single establishment.',
        ],
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'list_by_city_unavailable',
        data: null,
        facts: [
          `Tutors from “${city}”: ` + UNAVAILABLE,
          'Could not resolve establishments by city or list tutors by establishmentIds.',
        ],
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async tutorsWithoutAssignedStudents(): Promise<SkillResult> {
    const tutorsCall = await softCall(
      'Matching · active tutors',
      () => this.users.listTutorsPage({ limit: 50, statuses: ['active'] }),
      { timeoutMs: 10_000, retries: 1 },
    );
    const pairsCall = await this.loadPairsSample();

    if (!tutorsCall.ok || !tutorsCall.data) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'tutors_no_assigned_students_partial',
        data: null,
        facts: apiPartialFacts(
          'Tuteurs (Ednov)',
          new Error(tutorsCall.warning ?? 'Active tutors list failed'),
        ),
        warnings: collectWarnings(tutorsCall, pairsCall),
      };
    }

    const tutorsPage = tutorsCall.data;
    if (!pairsCall.ok || !pairsCall.data) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'tutors_no_assigned_students_partial',
        data: {
          tutorsSample: tutorsPage.tutors.length,
          tutorsTotal: tutorsPage.total,
        },
        facts: [
          ...answerFacts({
            answer:
              'Impossible de calculer les tuteurs sans élèves assignés : les affectations Matching n’ont pas pu être chargées à temps.',
            explanation:
              pairsCall.warning ??
              'L’échantillon Matching (paires élève–tuteur) est indisponible.',
            reasoning:
              `${tutorsPage.tutors.length} tuteur(s) actif(s) ont bien été listés` +
              (tutorsPage.total != null
                ? ` (total API ${tutorsPage.total})`
                : '') +
              ', mais sans les paires Matching on ne peut pas savoir qui n’a pas d’élève.',
            next: 'Réessayez, ou ouvrez Matching / Tuteurs dans Ednov.',
            source: 'Matching · Tuteurs (Ednov)',
          }),
          tutorsPage.tutors.length
            ? '| Tutor | Status |'
            : '',
          tutorsPage.tutors.length ? '| --- | --- |' : '',
          ...tutorsPage.tutors
            .slice(0, 15)
            .map(
              (t) =>
                `| ${tutorDisplayName(t)} | ${statusLabel(t.status)} |`,
            ),
        ].filter(Boolean),
        warnings: collectWarnings(tutorsCall, pairsCall),
      };
    }

    const pairsPage = pairsCall.data;
    const assigned = new Set(
      pairsPage.pairs
        .map((p) => p.tutorUserId || p.tutor?.id)
        .filter(Boolean) as string[],
    );
    const unassigned = tutorsPage.tutors.filter((t) => !assigned.has(t.id));

    return {
      skillId: this.id,
      ok: true,
      operation: 'tutors_no_assigned_students_sample',
      data: {
        unassignedCount: unassigned.length,
        tutorsSample: tutorsPage.tutors.length,
        tutorsTotal: tutorsPage.total,
        pairsSample: pairsPage.pairs.length,
        pairsTotal: pairsPage.total,
      },
      facts: [
        `Active tutors with no pair in the live Matching sample: ${unassigned.length} of ${tutorsPage.tutors.length}` +
          (tutorsPage.total != null
            ? ` (tutors API total ${tutorsPage.total})`
            : '') +
          (pairsPage.total != null
            ? `; pair API total ${pairsPage.total}`
            : '') +
          '.',
        'This is an authorization-scoped sample — not a guaranteed full-company census.',
        unassigned.length
          ? '| Tutor | Status | Note |'
          : 'No unassigned tutors in this sample.',
        unassigned.length ? '| --- | --- | --- |' : '',
        ...unassigned
          .slice(0, 20)
          .map(
            (t) =>
              `| ${tutorDisplayName(t)} | ${statusLabel(t.status)} | no pair in sample |`,
          ),
        'Next action: Assign students on Matching, or Open tutor profile.',
        'SOURCE: Matching · Tuteurs (Ednov)',
      ].filter(Boolean),
      warnings: collectWarnings(tutorsCall, pairsCall),
    };
  }

  private async tutorsWorkload(q: string): Promise<SkillResult> {
    const pairsCall = await this.loadPairsSample();
    if (!pairsCall.ok || !pairsCall.data) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'tutors_workload_partial',
        data: null,
        facts: apiPartialFacts(
          'Matching · charge tuteurs (Ednov)',
          new Error(pairsCall.warning ?? 'Matching pairs failed'),
        ),
        warnings: collectWarnings(pairsCall),
      };
    }

    const page = pairsCall.data;
    const counts = new Map<
      string,
      { label: string; count: number; sessionCountMax: number }
    >();

    for (const pair of page.pairs) {
      const tutorId = pair.tutorUserId || pair.tutor?.id;
      if (!tutorId) continue;
      const label = displayName(pair.tutor ?? {}) || 'Tutor';
      const prev = counts.get(tutorId) ?? {
        label,
        count: 0,
        sessionCountMax: 0,
      };
      prev.count += 1;
      if (typeof pair.sessionCount === 'number') {
        prev.sessionCountMax = Math.max(
          prev.sessionCountMax,
          pair.sessionCount,
        );
      }
      if (label !== 'Tutor') prev.label = label;
      counts.set(tutorId, prev);
    }

    const ranked = [...counts.values()].sort((a, b) => b.count - a.count);
    const overloadedHint = asksOverloaded(q);
    const top = overloadedHint ? ranked.slice(0, 8) : ranked.slice(0, 15);

    return {
      skillId: this.id,
      ok: true,
      operation: overloadedHint
        ? 'tutors_overloaded_sample'
        : 'tutors_highest_workload',
      data: { ranked: top, sampleSize: page.pairs.length },
      facts: [
        overloadedHint
          ? `Highest-workload tutors (proxy for overloaded) from live pair sample (${page.pairs.length} pairs` +
            (page.total != null ? `, API total ${page.total}` : '') +
            '):'
          : `Tutor workload ranking from live pair sample (${page.pairs.length} pairs` +
            (page.total != null ? `, API total ${page.total}` : '') +
            '):',
        top.length
          ? '| Rank | Tutor | Pair rows in sample | Max sessionCount |'
          : 'No tutor workload could be derived (empty pair sample).',
        top.length ? '| --- | --- | ---: | ---: |' : '',
        ...top.map(
          (row, i) =>
            `| ${i + 1} | ${row.label} | ${row.count} | ${
              row.sessionCountMax > 0 ? row.sessionCountMax : '—'
            } |`,
        ),
        'Workload = pair-row count in the authorization-scoped sample (and sessionCount when present) — not a separate capacity / overload threshold API.',
        'Dedicated “overloaded” boolean: ' + UNAVAILABLE + '.',
        'Next action: View timetable / balance assignments on Matching, or Open tutor profile.',
        'SOURCE: Matching · Tuteurs (Ednov)',
      ].filter(Boolean),
      warnings: collectWarnings(pairsCall),
    };
  }

  /** Matching pairs sample with fallback to a smaller page if the first call times out. */
  private async loadPairsSample() {
    const primary = await softCall(
      'Matching · student-tutor pairs',
      () => this.matching.listPairsPage({ page: 1, pageSize: 40 }),
      { timeoutMs: 12_000, retries: 0 },
    );
    if (primary.ok && primary.data) return primary;

    return softCall(
      'Matching · student-tutor pairs (small page)',
      () => this.matching.listPairsPage({ page: 1, pageSize: 20 }),
      { timeoutMs: 10_000, retries: 0 },
    );
  }

  private async tutorsNoUpcomingSessions(): Promise<SkillResult> {
    try {
      const [tutorsPage, pairsPage] = await Promise.all([
        this.users.listTutorsPage({ limit: 40, statuses: ['active'] }),
        this.matching.listPairsPage({ page: 1, pageSize: 100 }),
      ]);

      const nextByTutor = new Map<string, string | null>();
      for (const pair of pairsPage.pairs) {
        const tutorId = pair.tutorUserId || pair.tutor?.id;
        if (!tutorId) continue;
        const next = formatDate(pair.nextSession?.sessionDate);
        const prev = nextByTutor.get(tutorId);
        if (prev === undefined) {
          nextByTutor.set(tutorId, next);
        } else if (next && (!prev || next < prev)) {
          nextByTutor.set(tutorId, next);
        } else if (next == null && prev == null) {
          nextByTutor.set(tutorId, null);
        }
      }

      const withoutUpcoming = tutorsPage.tutors.filter((t) => {
        if (!nextByTutor.has(t.id)) return true; // no pair → no upcoming from pairs
        return nextByTutor.get(t.id) == null;
      });

      return {
        skillId: this.id,
        ok: true,
        operation: 'tutors_no_upcoming_sessions_sample',
        data: {
          withoutUpcoming: withoutUpcoming.length,
          tutorsSample: tutorsPage.tutors.length,
          pairsSample: pairsPage.pairs.length,
        },
        facts: [
          `Active tutors with no nextSession on Matching pair rows (sample): ${withoutUpcoming.length} of ${tutorsPage.tutors.length}.`,
          'Derived from pair `nextSession` — not a dedicated tutors-without-upcoming-sessions endpoint.',
          withoutUpcoming.length
            ? '| Tutor | Note |'
            : 'Every sampled tutor with pairs has a nextSession, or sample empty.',
          withoutUpcoming.length ? '| --- | --- |' : '',
          ...withoutUpcoming
            .slice(0, 20)
            .map((t) => {
              const hasPair = nextByTutor.has(t.id);
              return `| ${tutorDisplayName(t)} | ${
                hasPair
                  ? 'pair(s) without nextSession'
                  : 'no pair in sample'
              } |`;
            }),
          'Company-wide session list filtered by tutorId: ' +
            UNAVAILABLE +
            ' on GET /sessions (participant search only).',
          'Next action: Schedule new session or Open Matching for this tutor.',
        ].filter(Boolean),
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'tutors_no_upcoming_partial',
        data: null,
        facts: apiPartialFacts('Matching · Tuteurs (Ednov)', error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async openTutorProfile(
    q: string,
    focusedId: string | undefined,
    labelHint: string | undefined,
    name: string | null,
  ): Promise<SkillResult> {
    let tutorId = focusedId;
    let hint = labelHint;
    if (!tutorId && name) {
      const search = await softCall('GET /search/global', () =>
        this.users.globalSearch(name),
      );
      const hit = search.data?.tutors[0];
      if (hit?.id) {
        tutorId = hit.id;
        hint = displayName(hit) || name;
        rememberProfile(`tutor:${tutorId}`, hit);
      } else if (!search.ok) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'tutor_profile_search_partial',
          data: null,
          facts: answerFacts({
            answer: `Could not search for tutor “${name}” right now.`,
            explanation: search.warning ?? 'GET /search/global failed.',
            next: 'Select the tutor on the page and ask again.',
            source: 'Recherche',
          }),
          warnings: collectWarnings(search),
        };
      }
    }
    if (!tutorId) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'tutor_profile_needs_entity',
        data: null,
        facts: ambiguousEntityFacts('tutor'),
      };
    }
    return this.focusedTutorDetail(tutorId, hint, q);
  }

  private async focusedTutorDetail(
    tutorId: string,
    labelHint: string | undefined,
    q: string,
  ): Promise<SkillResult> {
    try {
      const byTutor = await softCall('GET /users/tutors/:id', () =>
        this.users.findTutorById(tutorId),
      );
      let tutor = byTutor.data;
      const warnings = collectWarnings(byTutor);
      if (byTutor.forbidden) {
        tutor = null;
      } else if (!tutor && labelHint) {
        const search = await softCall('GET /search/global', () =>
          this.users.globalSearch(labelHint),
        );
        warnings.push(...collectWarnings(search));
        tutor = search.data?.tutors.find((t) => t.id === tutorId) ?? null;
        if (tutor) logFallback('tutor by id', 'global search');
      }
      if (!tutor && byTutor.timedOut) {
        tutor = recallProfile<EdnovUserRow>(`tutor:${tutorId}`);
        if (tutor) {
          warnings.push('Using recently cached tutor profile.');
          logFallback('tutor by id', 'cached profile');
        }
      }
      if (!tutor) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'focused_tutor_partial',
          data: null,
          facts: answerFacts({
            answer: labelHint
              ? `Could not load the live profile for tutor “${labelHint}”.`
              : 'Could not load the selected tutor profile right now.',
            explanation: warnings.join(' ') || 'Users APIs returned no tutor row.',
            reasoning: 'Timeout/authorization is not a documentation gap.',
            next: 'Select the tutor on the page and ask again.',
            source: 'GET /users/tutors/:id',
          }),
          warnings,
        };
      }
      rememberProfile(`tutor:${tutorId}`, tutor);
      const label = displayName(tutor) || labelHint || 'focused tutor';
      const facts = answerFacts({
        answer: `Tutor ${label} — status ${statusLabel(tutor.status)}, establishment ${establishmentLabelFromRow(tutor)}.`,
        explanation: 'Page context first, else global search, then tutor profile.',
        reasoning:
          'Profile and status come from Users APIs; assigned students and recent sessions come from Matching pairs. Timeouts are listed as PARTIAL.',
        next: 'View timetable, Show assigned students, Open reports, or Schedule new session.',
        source: 'Tuteurs',
        extra: [
          `Current status: ${statusLabel(tutor.status)}.`,
          `Establishment: ${establishmentLabelFromRow(tutor)}.`,
        ],
      });

      const subjects =
        tutor.userProfiles?.[0]?.subjectNames?.filter(Boolean) ?? [];
      facts.push(
        subjects.length
          ? `Subjects: ${subjects.slice(0, 8).join(', ')}.`
          : 'Subjects: data unavailable on payload.',
      );

      if (typeof tutor.pendingActivation === 'boolean') {
        facts.push(
          tutor.pendingActivation
            ? 'Activation: email activation still pending (pendingActivation=true).'
            : 'Activation: not flagged pending on detail.',
        );
      }

      if (tutor.status === 'deactivated') {
        facts.push(
          tutor.deactivationReason
            ? `Deactivation reason: ${tutor.deactivationReason}.`
            : 'Deactivation reason: data unavailable.',
        );
      }

      if (asksTimeline(q) || asksHistory(q)) {
        try {
          const history = await this.users.getUserStatusHistory(tutorId);
          facts.push('### Status history');
          if (history.length) {
            facts.push('| When | From | To | Source |');
            facts.push('| --- | --- | --- | --- |');
            facts.push(
              ...history.slice(0, 12).map((h) => {
                const when = formatDate(h.createdAt) ?? '—';
                return `| ${when} | ${statusLabel(h.previousStatus)} | ${statusLabel(h.newStatus)} | ${h.source ?? '—'} |`;
              }),
            );
          } else {
            facts.push('No status-history rows returned.');
          }
        } catch {
          facts.push(
            'Status history: ' +
              UNAVAILABLE +
              ' (endpoint error or unauthorized for this tutor).',
          );
        }
      }

      let pairs: StudentTutorPair[] = [];
      const pairsPage = await softCall(
        'GET /sessions/student-tutor-pairs',
        () =>
          this.matching.listPairsPage({
            page: 1,
            pageSize: 30,
            tutorId,
          }),
      );
      warnings.push(...collectWarnings(pairsPage));
      if (pairsPage.ok && pairsPage.data) {
        pairs = pairsPage.data.pairs;
        facts.push(
          pairs.length
            ? `Assigned students / pairs: ${pairs.length}` +
                (pairsPage.data.total != null
                  ? ` (API total ${pairsPage.data.total})`
                  : '') +
                '.'
            : 'Assigned students: no pair for this tutor in live Matching query.',
        );
        if (pairs.length) {
          facts.push('| Student | Origin | Session status | Last | Next |');
          facts.push('| --- | --- | --- | --- | --- |');
          facts.push(
            ...pairs.slice(0, 12).map((p) => {
              const student = displayName(p.student ?? {}) || '—';
              const last = formatDate(
                p.lastSession?.sessionDate ?? p.session?.sessionDate,
              );
              const next = formatDate(p.nextSession?.sessionDate);
              return `| ${student} | ${p.assignmentSource ?? p.status ?? '—'} | ${p.session?.status ?? '—'} | ${last ?? '—'} | ${next ?? '—'} |`;
            }),
          );
          const last = formatDate(pairs[0].lastSession?.sessionDate);
          const next = formatDate(pairs[0].nextSession?.sessionDate);
          facts.push(
            `Recent activity: last session ${last ?? 'n/a'}; next session ${next ?? 'n/a'}.`,
          );
        }
      } else {
        facts.push(
          pairsPage.warning
            ? `PARTIAL: ${pairsPage.warning}`
            : 'Assigned students / matching history: could not load pairs.',
        );
      }

      if (asksTimeline(q) || asksSessions(q)) {
        const past = pairs.filter((p) => p.lastSession?.sessionDate);
        const future = pairs.filter((p) => p.nextSession?.sessionDate);
        facts.push(
          `Past/future sessions from pair payloads: ${past.length} with lastSession, ${future.length} with nextSession.`,
        );
        facts.push(
          'Full tutor session timeline via GET /sessions?tutorId=: ' +
            UNAVAILABLE +
            ' (use Matching next/last or Sessions participant search).',
        );
      }

      if (asksTimeline(q) || asksReports(q)) {
        try {
          const reports = await this.academic.listReports(10, { tutorId });
          if (reports.length) {
            facts.push(`Reports for this tutor: ${reports.length} row(s).`);
            facts.push('| Report | Status |');
            facts.push('| --- | --- |');
            facts.push(
              ...reports.slice(0, 8).map((r) => {
                const row = r as {
                  id?: string;
                  status?: string;
                  sessionDisplayName?: string;
                };
                return `| ${row.sessionDisplayName ?? row.id ?? 'report'} | ${row.status ?? '—'} |`;
              }),
            );
          } else {
            facts.push(
              'Reports for this tutor: empty list from GET /sessions/reports?tutorId.',
            );
          }
        } catch {
          facts.push(
            'Tutor-scoped reports: ' +
              UNAVAILABLE +
              ' (endpoint error or unauthorized).',
          );
        }
      }

      if (asksActivity(q)) {
        facts.push(
          'Dedicated tutor activity feed / audit trail: ' + UNAVAILABLE + '.',
        );
      }

      facts.push(
        'Next action: View timetable, Show assigned students, Open reports, Notify coordinator, or Schedule new session.',
      );

      return {
        skillId: this.id,
        ok: true,
        operation: 'focused_tutor_detail',
        data: summarizeTutorRow(tutor),
        facts: facts.filter(Boolean),
        warnings: warnings.length ? warnings : undefined,
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'focused_tutor_partial',
        data: null,
        facts: answerFacts({
          answer: labelHint
            ? `Could not load focused tutor “${labelHint}” (partial failure).`
            : 'Could not load focused tutor (partial failure).',
          explanation: safeErrorMessage(error),
          next: 'Open Tutors and select the row, then ask again.',
          source: 'GET /users/tutors/:id',
        }),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async diagnoseTutor(args: {
    tutorId: string;
    labelHint?: string;
    question: string;
  }): Promise<SkillResult> {
    const detail = await this.focusedTutorDetail(
      args.tutorId,
      args.labelHint,
      args.question,
    );
    const facts: string[] = [
      '## Tutor availability / status diagnosis (live facts only)',
      ...(detail.facts ?? []),
    ];

    try {
      const tutor = await this.users.findTutorById(args.tutorId);
      const status = tutor.status ?? null;

      facts.push(
        `## Current situation — account status: ${statusLabel(status)}.`,
      );
      if (status === 'deactivated') {
        facts.push('## Blocker: tutor account is deactivated.');
        facts.push(
          '## Next action: review deactivation reason on profile; Reactivate in Ednov when authorized.',
        );
      } else if (status === 'active') {
        facts.push('## Completed: account status active.');
      } else if (!status) {
        facts.push('## Status field missing on payload — do not invent.');
      }

      if (tutor.pendingActivation === true) {
        facts.push('## Blocker: pendingActivation=true — activation incomplete.');
        facts.push('## Next action: complete email activation for this tutor.');
      }

      const pairsPage = await this.matching
        .listPairsPage({ page: 1, pageSize: 30, tutorId: args.tutorId })
        .catch(() => null);
      if (pairsPage) {
        const workload = pairsPage.pairs.length;
        facts.push(
          `## Workload signal: ${workload} pair row(s)` +
            (pairsPage.total != null ? ` (API total ${pairsPage.total})` : '') +
            '.',
        );
        const withNext = pairsPage.pairs.filter((p) => p.nextSession?.sessionDate);
        facts.push(
          withNext.length
            ? `## Upcoming: ${withNext.length} pair(s) expose nextSession.`
            : '## Upcoming: no nextSession on pair payloads for this tutor.',
        );
      }

      if (asksUnavailableWhy(args.question)) {
        facts.push(
          '## Slot conflict / free-busy for a specific datetime: use GET /sessions/check-tutor-availability (tutorId + date + times) — not called without a focused session slot.',
        );
        facts.push(
          '## Company-wide “why unavailable” rule engine dump: ' + UNAVAILABLE + '.',
        );
        facts.push(
          '## Next action: open Tutors timetable / Matching with a session focused, or Schedule new session with conflict check.',
        );
      } else {
        facts.push(
          '## Next action: View timetable, Show assigned students, or Notify coordinator.',
        );
      }
    } catch {
      facts.push('Could not complete diagnosis — do not invent blockers.');
    }

    return {
      skillId: this.id,
      ok: true,
      operation: 'tutor_diagnosis',
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

function wantsTutorProfile(
  q: string,
  hasFocus: boolean,
  name: string | null,
): boolean {
  const profileIntent =
    /\b(open|ouvre|ouvrir|show|montre|affiche|fiche|profil(?:e)?)\b/i.test(q);
  if (!profileIntent) return false;
  const thisTutor = /\b(this tutor|ce tuteur|cette tuteure|cette tutrice)\b/i.test(
    q,
  );
  const tutorWord = /\b(tutor|tuteur|tuteure)\b/i.test(q);
  if (thisTutor || tutorWord) return true;
  return hasFocus || Boolean(name);
}

function extractTutorSearch(question: string): string | null {
  const allMatch = question.match(
    /\b(?:all|tous?|toutes?)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+)\b/iu,
  );
  if (allMatch?.[1]) return allMatch[1].trim();

  const named = extractPersonName(question);
  if (named) return named;

  const single = question.match(
    /\b(?:tutor|tuteur|tuteure|teacher|professeur)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+)\b/iu,
  );
  if (single?.[1]) return single[1].trim();

  const findSingle = question.match(
    /\b(?:find|search|cherche|montre|show|who is|qui est)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'-]+)?)\b/iu,
  );
  if (findSingle?.[1]) return findSingle[1].trim();

  return null;
}

function extractCityName(q: string): string | null {
  const m = q.match(
    /\b(?:from|de|à|a|in|à)\s+([A-ZÀ-Ÿ][\wÀ-ÿ'-]+)\b/iu,
  );
  if (m?.[1] && !/^(tutor|tuteur|the|les|des|une?)$/i.test(m[1])) {
    return m[1].trim();
  }
  if (/\bparis\b/i.test(q)) return 'Paris';
  return null;
}

function statusLabel(status?: string | null): string {
  if (!status) return '—';
  return STATUS_LABEL[status] ?? status;
}

function tutorDisplayName(t: TutorListItem): string {
  return `${t.firstName} ${t.lastName}`.trim() || 'Tutor';
}

function establishmentLabel(t: TutorListItem): string {
  const est = t.establishments?.[0];
  if (est?.name) {
    return est.city ? `${est.name} (${est.city})` : est.name;
  }
  return '—';
}

function establishmentLabelFromRow(tutor: EdnovUserRow): string {
  const est = tutor.userEstablishments?.[0]?.establishment;
  if (est?.name?.trim()) {
    return est.city?.trim()
      ? `${est.name.trim()} (${est.city.trim()})`
      : est.name.trim();
  }
  return '—';
}

function subjectsLabel(t: TutorListItem): string {
  if (!t.coursesTaught?.length) return '—';
  return t.coursesTaught.map((c) => c.subject).join(', ');
}

function summarizeTutor(t: TutorListItem) {
  return {
    name: tutorDisplayName(t),
    status: t.status ?? null,
    establishment: establishmentLabel(t),
    subjects: subjectsLabel(t),
  };
}

function summarizeTutorRow(tutor: EdnovUserRow) {
  return {
    name: displayName(tutor),
    status: tutor.status ?? null,
    establishment: establishmentLabelFromRow(tutor),
    subjects: tutor.userProfiles?.[0]?.subjectNames?.slice(0, 5) ?? [],
    pendingActivation:
      typeof tutor.pendingActivation === 'boolean'
        ? tutor.pendingActivation
        : null,
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

function asksAvailableToday(q: string): boolean {
  return (
    /\b(available|disponibles?|dispo)\b/i.test(q) &&
    /\b(today|aujourd['’]?hui|aujourdhui|ce jour|cette journée|cette journee)\b/i.test(
      q,
    )
  );
}

function asksAvailability(q: string): boolean {
  return (
    /\b(availability|disponibilité|disponibilite|available|disponibles?)\b/i.test(
      q,
    ) && /\b(tutor|tuteur)/i.test(q)
  );
}

function asksSearch(q: string): boolean {
  return /\b(find|search|cherche|montre|show|who is|qui est|all|tous?)\b/i.test(
    q,
  );
}

function asksList(q: string): boolean {
  return /\b(list|liste|show|montre|which|quels?|quelles?)\b/i.test(q);
}

function asksNoAssignedStudents(q: string): boolean {
  return /\b(no assigned students|sans élèves?|sans eleves?|without students|pas d['’]?élèves?|pas d['’]?eleves?|aucun élève|aucun eleve|unassigned tutors?|tuteurs? sans)\b/i.test(
    q,
  );
}

function asksOverloaded(q: string): boolean {
  return /\b(overload|overloaded|surchargés?|surcharges?|trop d['’]?élèves|trop d['’]?eleves)\b/i.test(
    q,
  );
}

function asksHighestWorkload(q: string): boolean {
  return /\b(workload|charge|highest|plus d['’]?élèves|plus d['’]?eleves|most students|plus de binômes|plus de binomes|most active|plus actifs?|tuteurs? les plus actifs|tutors? (with )?the most)\b/i.test(
    q,
  );
}

function asksNoUpcomingSessions(q: string): boolean {
  return (
    /\b(no upcoming|sans séance|sans seance|no (next )?session|pas de (prochaine )?séance|pas de (prochaine )?seance|without upcoming)\b/i.test(
      q,
    ) ||
    (/\b(upcoming|prochaines?)\b/i.test(q) &&
      /\b(none|aucun|sans|without|no)\b/i.test(q))
  );
}

function asksInactiveList(q: string): boolean {
  return /\b(inactive|inactifs?|deactivated|désactivés?|desactives?|archived|archivés?)\b/i.test(
    q,
  );
}

function asksActiveList(q: string): boolean {
  return /\b(active tutors?|tuteurs? actifs?|list.*active|actifs?)\b/i.test(q);
}

function asksByEstablishment(q: string): boolean {
  return /\b(by establishment|par établissement|par etablissement|establishment|établissement|etablissement)\b/i.test(
    q,
  );
}

function asksByCity(q: string): boolean {
  return (
    /\b(from|de|à|in)\s+[A-ZÀ-Ÿ]/iu.test(q) ||
    /\b(paris|lyon|marseille|toulouse|bordeaux|lille|nantes|strasbourg)\b/i.test(
      q,
    ) ||
    /\b(city|ville)\b/i.test(q)
  );
}

function asksByProgram(q: string): boolean {
  return (
    /\b(by program|par programme|program|programme)\b/i.test(q) &&
    /\b(tutor|tuteur|teachers?)\b/i.test(q)
  );
}

function asksTimeline(q: string): boolean {
  return /\b(timeline|history|historique|parcours|activity|activité|activite)\b/i.test(
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
  return /\b(this tutor|ce tuteur|cette tutrice|he|she|his|her|their|son|sa|leur|il|elle|lui)\b/i.test(
    q,
  );
}

function asksAssignedStudents(q: string): boolean {
  return /\b(assigned students|élèves assignés|eleves assignes|ses élèves|ses eleves|his students|her students|their students|appari)\b/i.test(
    q,
  );
}

function asksReports(q: string): boolean {
  return /\b(report|reports|compte.?rendu|comptes?.?rendus?)\b/i.test(q);
}

function asksSessions(q: string): boolean {
  return /\b(session|sessions|séance|seance|séances|seances|timetable|emploi du temps|planning)\b/i.test(
    q,
  );
}

function asksActivity(q: string): boolean {
  return /\b(activity|activité|activite|audit|feed)\b/i.test(q);
}

function asksDiagnostic(q: string): boolean {
  return (
    asksUnavailableWhy(q) ||
    /\b(why|pourquoi|blocked|bloqué|bloque|what.?s missing|que manque|diagnosis|diagnost|unavailable|indisponible)\b/i.test(
      q,
    )
  );
}

function asksUnavailableWhy(q: string): boolean {
  return /\b(why.*(unavailable|indisponible)|pourquoi.*(indisponible|unavailable)|unavailable because|pas disponible)\b/i.test(
    q,
  );
}
