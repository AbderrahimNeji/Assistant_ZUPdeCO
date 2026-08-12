import { Injectable } from '@nestjs/common';

import { AcademicAdapter } from '../../integration/adapters/academic.adapter';
import {
  MatchingAdapter,
  StudentTutorPair,
} from '../../integration/adapters/matching.adapter';
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
  softCall,
} from '../skill-resilience';

const ACTIVE_SESSION_STATUSES = new Set([
  'PLANNED',
  'IN_PROGRESS',
  'planned',
  'in_progress',
]);

/**
 * Matching / pairing between students and tutors.
 * Uses Ednov `/sessions/student-tutor-pairs` (+ candidates) — never invents pairings.
 */
@Injectable()
export class MatchingSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'matching';
  readonly domains = [
    /\b(match|matching|pair|pairs|binôme|binome|binômes|binomes|assigned tutor|tuteur assigné|without a tutor|sans tuteur|appariement|appariements|unmatched|non.?apparié|non.?apparie|workload|charge|disponible|available tutor|matching statistics|statistiques? (?:de |d['’])?(?:matching|appariement)|waiting for a tutor|attendent un tuteur)\b/i,
  ];
  readonly domainTags = [
    'matching',
    'pairing',
    'binome',
    'unmatched',
    'tutor-availability',
    'workload',
    'assignment-source',
  ];
  readonly capabilities: SkillCapability[] = [
    'search',
    'list',
    'status',
    'count',
    'stats',
  ];

  constructor(
    private readonly matching: MatchingAdapter,
    private readonly users: UserAdapter,
    private readonly academic: AcademicAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      if (!isStaffRole(ctx.user.role)) {
        return {
          skillId: this.id,
          ok: false,
          operation: 'unauthorized',
          data: null,
          facts: ['Matching data requires staff authorization.'],
        };
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      const q = ctx.question;
      const name = extractPersonName(q);
      const focusedStudentId =
        this.users.resolveFocusedStudentId() ||
        this.matching.resolveContextStudentId();
      const focusedTutorId =
        this.users.resolveFocusedTutorId() ||
        this.matching.resolveContextTutorId();
      const focusedPairId = this.matching.resolveFocusedMatchingId();
      const sessionId = this.academic.resolveFocusedSessionId();

      if (asksPendingValidation(q)) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'pending_validation_unavailable',
          data: null,
          facts: [
            'Pending-validation matchings: data unavailable — Ednov pair records expose assignmentSource (manual / auto_*), not a validation workflow status.',
            'Do not invent a pending-validation queue.',
            'Next action: open Matching → Liste des binômes and filter by assignment source if needed.',
          ],
        };
      }

      if (asksCreator(q)) {
        if (focusedPairId) {
          return this.pairProvenance(focusedPairId, q);
        }
        return {
          skillId: this.id,
          ok: true,
          operation: 'creator_unavailable',
          data: null,
          facts: [
            'Who created a matching: creator user id is unavailable on the pairs API.',
            'createdAt may be available on a focused pair; open or select a binôme to inspect creation date and assignmentSource.',
            'Do not invent a creator name.',
          ],
        };
      }

      if (asksCountActive(q)) {
        return this.countActiveMatchings();
      }

      if (asksWorkload(q)) {
        return this.tutorsHighestWorkload();
      }

      if (asksWaiting(q)) {
        return this.studentsWaiting(q);
      }

      if (asksUnmatched(q)) {
        return this.unmatchedStudents(sessionId);
      }

      if (asksAvailableTutors(q)) {
        return this.availableTutors(sessionId);
      }

      if (asksWhoCanMatch(q)) {
        if (sessionId) {
          return this.availableTutors(sessionId);
        }
        if (focusedStudentId || name) {
          return this.whyStudentNotMatched({
            studentId: focusedStudentId,
            name,
            sessionId,
            labelHint:
              ctx.applicationContext?.student?.label?.trim() ||
              ctx.applicationContext?.selection?.primary?.label?.trim(),
          });
        }
        return {
          skillId: this.id,
          ok: true,
          operation: 'who_can_match_needs_entity',
          data: null,
          facts: ambiguousEntityFacts('student'),
        };
      }

      if (asksWhyNotMatched(q) || (focusedStudentId && asksStatus(q))) {
        if (!focusedStudentId && !name) {
          return {
            skillId: this.id,
            ok: true,
            operation: 'why_not_matched_needs_student',
            data: null,
            facts: ambiguousEntityFacts('student'),
          };
        }
        let studentId = focusedStudentId;
        if (!studentId && name) {
          const search = await softCall('GET /search/global', () =>
            this.users.globalSearch(name),
          );
          studentId = search.data?.students[0]?.id;
          if (!studentId) {
            return {
              skillId: this.id,
              ok: true,
              operation: 'why_not_matched_unresolved',
              data: null,
              facts: answerFacts({
                answer: `No student named “${name}” in live search — please pick the student on the page or spell the full name.`,
                explanation: search.warning ?? 'GET /search/global returned no student hit.',
                reasoning: 'An unresolved name is not a missing-document case.',
                next: 'Open Students, select the row, then ask again.',
                source: 'GET /search/global',
              }),
              warnings: collectWarnings(search),
            };
          }
        }
        return this.whyStudentNotMatched({
          studentId,
          name,
          sessionId,
          labelHint:
            ctx.applicationContext?.student?.label?.trim() ||
            ctx.applicationContext?.selection?.primary?.label?.trim() ||
            name ||
            undefined,
        });
      }

      if (focusedPairId) {
        return this.focusedPair(focusedPairId);
      }

      if (focusedStudentId || name) {
        return this.studentMatchingLookup({
          studentId: focusedStudentId,
          name,
          labelHint: ctx.applicationContext?.student?.label?.trim(),
        });
      }

      if (focusedTutorId) {
        return this.tutorMatchingLookup(focusedTutorId, ctx);
      }

      if (sessionId) {
        return this.sessionMatching(sessionId, ctx);
      }

      return this.matchingOverview();
    } catch (error) {
      return matchingPartial(this.id, 'error_partial', error);
    }
  }

  private async focusedPair(pairId: string): Promise<SkillResult> {
    try {
      const pair = await this.matching.getPair(pairId);
      return {
        skillId: this.id,
        ok: true,
        operation: 'focused_pair',
        data: redactPair(pair),
        facts: pairFacts(pair, 'Focused matching pair'),
      };
    } catch (error) {
      return matchingPartial(this.id, 'focused_pair_partial', error);
    }
  }

  private async pairProvenance(pairId: string, q: string): Promise<SkillResult> {
    try {
      const pair = await this.matching.getPair(pairId);
      const created = formatDate(pair.createdAt);
      const facts = [
        ...pairFacts(pair, 'Focused matching provenance'),
        created
          ? `Created at (live): ${created}.`
          : 'Created at: data unavailable on this pair payload.',
        'Creator user: data unavailable — pairs API has no createdBy / creator field.',
        pair.assignmentSource
          ? `Assignment origin: ${sourceLabel(pair.assignmentSource)}.`
          : 'Assignment origin: data unavailable.',
      ];
      if (asksCreator(q) && !created) {
        facts.push('Do not invent who created this matching or when.');
      }
      return {
        skillId: this.id,
        ok: true,
        operation: 'pair_provenance',
        data: redactPair(pair),
        facts,
      };
    } catch (error) {
      return matchingPartial(this.id, 'pair_provenance_partial', error, [
        'Creator user remains unavailable on the pairs API.',
      ]);
    }
  }

  private async countActiveMatchings(): Promise<SkillResult> {
    try {
      const { total, sampleSize } = await this.matching.countPairs();
      const sample = await this.matching.listPairsPage({ page: 1, pageSize: 50 });
      const withSessionStatus = sample.pairs.filter((p) => p.session?.status);
      const activeInSample = withSessionStatus.filter((p) =>
        ACTIVE_SESSION_STATUSES.has(String(p.session?.status)),
      ).length;

      const facts: string[] = [];
      if (total != null) {
        facts.push(
          `Student–tutor pair records (authorization-scoped total from Matching API): ${total}.`,
        );
      } else {
        facts.push(
          `Student–tutor pair records: API total unavailable; sample size on count probe: ${sampleSize}.`,
        );
      }

      if (withSessionStatus.length) {
        facts.push(
          `In a live sample of ${sample.pairs.length} pairs with session status, ${activeInSample} are on PLANNED/IN_PROGRESS sessions.`,
        );
      } else {
        facts.push(
          'Session-status breakdown for “active” matchings: data unavailable on this sample (session.status missing).',
        );
      }
      facts.push(
        '“Active matching” here means pair rows returned by Ednov Matching — there is no separate active/inactive pair flag.',
      );
      facts.push('Next action: open Matching → Liste des binômes to review pairs.');

      return {
        skillId: this.id,
        ok: true,
        operation: 'count_active_matchings',
        data: {
          total,
          sampleSize: sample.pairs.length,
          activeInSample:
            withSessionStatus.length > 0 ? activeInSample : null,
        },
        facts,
      };
    } catch (error) {
      return matchingPartial(this.id, 'count_active_matchings_partial', error);
    }
  }

  private async unmatchedStudents(
    sessionId?: string,
  ): Promise<SkillResult> {
    if (sessionId) {
      try {
        const [candidates, pairsPage] = await Promise.all([
          this.matching.getAssignmentCandidates(sessionId),
          this.matching.listPairsPage({
            page: 1,
            pageSize: 100,
            sessionId,
          }),
        ]);
        const matched = new Set(
          pairsPage.pairs
            .map((p) => p.studentUserId || p.student?.id)
            .filter(Boolean) as string[],
        );
        const unmatched = candidates.students.filter(
          (s) => s.id && !matched.has(s.id),
        );
        const sessionLabel = 'focused session';
        return {
          skillId: this.id,
          ok: true,
          operation: 'unmatched_students_session',
          data: {
            unmatchedCount: unmatched.length,
            candidateStudents: candidates.students.length,
            pairsOnSession: pairsPage.pairs.length,
            pairsTotal: pairsPage.total,
          },
          facts: [
            `Unmatched eligible students for ${sessionLabel} (assignment-candidates vs session pairs): ${unmatched.length} of ${candidates.students.length}.`,
            pairsPage.total != null
              ? `Pairs on this session (API total): ${pairsPage.total}.`
              : `Pairs loaded for this session (sample): ${pairsPage.pairs.length}.`,
            unmatched.length
              ? '| Student | Status |'
              : 'All eligible candidate students appear paired on this session sample.',
            unmatched.length ? '| --- | --- |' : '',
            ...unmatched
              .slice(0, 20)
              .map((s) => `| ${personLabel(s) || '—'} | unmatched (no pair on session) |`),
            'Availability of tutors for these students requires checking assignment candidates / tutor availability — do not invent.',
            'Next action: Assign tutor on the session Matching / Configure view.',
          ].filter(Boolean),
        };
      } catch (error) {
        return matchingPartial(
          this.id,
          'unmatched_students_session_partial',
          error,
        );
      }
    }

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
      return {
        skillId: this.id,
        ok: true,
        operation: 'unmatched_students_sample',
        data: {
          unmatchedCount: unmatched.length,
          studentsSample: students.length,
          pairsSample: pairsPage.pairs.length,
          pairsTotal: pairsPage.total,
        },
        facts: [
          `Unmatched students (authorization-scoped sample): ${unmatched.length} of ${students.length} listed students have no pair in the first ${pairsPage.pairs.length} pair rows` +
            (pairsPage.total != null
              ? ` (API pair total: ${pairsPage.total}).`
              : '.'),
          'This is not a guaranteed full-company census — treat as live sample for coordinator triage.',
          unmatched.length
            ? '| Student | Note |'
            : 'No unmatched students in this sample (every listed student appears in the pair sample).',
          unmatched.length ? '| --- | --- |' : '',
          ...unmatched
            .slice(0, 20)
            .map(
              (s) =>
                `| ${displayName(s)} | not found in loaded pair sample |`,
            ),
          'Waiting time since unmatched: data unavailable (no wait-start / unmatched-since field on students).',
          'Next action: open Matching to Assign tutor, or focus a session for eligibility-accurate unmatched candidates.',
        ].filter(Boolean),
      };
    } catch (error) {
      return matchingPartial(this.id, 'unmatched_students_partial', error);
    }
  }

  private async availableTutors(sessionId?: string): Promise<SkillResult> {
    if (sessionId) {
      try {
        const candidates = await this.matching.getAssignmentCandidates(sessionId);
        return {
          skillId: this.id,
          ok: true,
          operation: 'available_tutors_session',
          data: { count: candidates.tutors.length },
          facts: [
            `Available / eligible tutors for focused session (assignment-candidates): ${candidates.tutors.length}.`,
            candidates.tutors.length
              ? '| Tutor | Note |'
              : 'No eligible tutors returned for this session (establishment / subject / availability filters).',
            candidates.tutors.length ? '| --- | --- |' : '',
            ...candidates.tutors
              .slice(0, 20)
              .map(
                (t) =>
                  `| ${personLabel(t) || '—'} | eligible candidate (live) |`,
              ),
            'These tutors passed Ednov eligibility (establishment, subject, weekly availability) for this session.',
            'Next action: Assign tutor or review tutor availability on the session.',
          ].filter(Boolean),
        };
      } catch (error) {
        return matchingPartial(
          this.id,
          'available_tutors_session_partial',
          error,
        );
      }
    }

    try {
      const tutors = await this.users.listTutors(30);
      return {
        skillId: this.id,
        ok: true,
        operation: 'available_tutors_roster',
        data: { count: tutors.length },
        facts: [
          `Tutor roster (authorization-scoped sample): ${tutors.length}.`,
          'Session-specific availability (créneaux / matière / établissement): data unavailable without a focused session — open a session or Matching configure view.',
          '| Tutor | Note |',
          '| --- | --- |',
          ...tutors
            .slice(0, 20)
            .map(
              (t) =>
                `| ${`${t.firstName} ${t.lastName}`.trim()} | roster only — eligibility not verified |`,
            ),
          'Next action: select a session to View tutor availability via assignment-candidates.',
        ],
      };
    } catch (error) {
      return matchingPartial(this.id, 'available_tutors_partial', error);
    }
  }

  private async whyStudentNotMatched(args: {
    studentId?: string;
    name?: string | null;
    sessionId?: string;
    labelHint?: string;
  }): Promise<SkillResult> {
    const studentLabel =
      args.labelHint ||
      args.name ||
      (args.studentId
        ? await this.safeStudentLabel(args.studentId)
        : 'focused student');

    try {
      const pairsCall = await softCall(
        'GET /sessions/student-tutor-pairs',
        () =>
          this.matching.listPairsPage({
            page: 1,
            pageSize: 20,
            ...(args.studentId ? { studentId: args.studentId } : {}),
            ...(args.name && !args.studentId ? { search: args.name } : {}),
          }),
      );
      if (!pairsCall.ok || !pairsCall.data) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'why_not_matched_partial',
          data: null,
          facts: answerFacts({
            answer: `Matching diagnosis for “${studentLabel}” is incomplete because Matching timed out or failed.`,
            explanation:
              pairsCall.warning ??
              'GET /sessions/student-tutor-pairs did not return pairs.',
            reasoning:
              'A timeout is not “information not found in documents”. Use the page selection and retry.',
            next: 'Open Matching for this student, or ask again after selecting them.',
            source: 'GET /sessions/student-tutor-pairs',
          }),
          warnings: collectWarnings(pairsCall),
        };
      }
      const pairsPage = pairsCall.data;
      const warnings = collectWarnings(pairsCall);

      let related = pairsPage.pairs;
      if (args.studentId) {
        related = pairsPage.pairs.filter(
          (p) =>
            p.studentUserId === args.studentId ||
            p.student?.id === args.studentId,
        );
      } else if (args.name) {
        const needle = args.name.toLowerCase();
        related = pairsPage.pairs.filter((p) =>
          personLabel(p.student).toLowerCase().includes(needle),
        );
      }

      const facts: string[] = [
        related.length
          ? `DIRECT ANSWER: ${studentLabel} IS matched — ${related.length} pair record(s) in live Matching.`
          : `DIRECT ANSWER: ${studentLabel} has no pair in the live Matching query (unmatched in this authorization scope).`,
        'EXPLANATION: Diagnosis uses GET /sessions/student-tutor-pairs (and assignment-candidates when a session is focused).',
        'BUSINESS REASONING: Matching is session-scoped. Absence of a pair row means unmatched in this authorization scope — not a missing-document case.',
        related.length
          ? 'NEXT ACTION: Open student profile or review the focused binôme on Matching.'
          : 'NEXT ACTION: Assign tutor from Matching, or open a session to load eligible tutors.',
        'SOURCE: GET /sessions/student-tutor-pairs',
        'Do not reply that the information was not found in documents.',
      ];

      if (related.length) {
        facts.push(
          `Live status: ${related.length} pair record(s) found — student IS matched in loaded data.`,
        );
        facts.push('| Student | Tutor | Origin | Session status | Created |');
        facts.push('| --- | --- | --- | --- | --- |');
        facts.push(
          ...related.slice(0, 10).map((p) => pairTableRow(p)),
        );
        facts.push(
          'If the coordinator expected “unmatched”, clarify session scope — pairs are per session.',
        );
        facts.push(
          'Next action: Open student profile or review the focused binôme on Matching.',
        );
      } else {
        facts.push(
          'Live status: no pair found for this student in the authorization-scoped Matching query.',
        );
        facts.push(
          pairsPage.total != null
            ? `Query returned 0 of ${pairsPage.total} pair total for this filter.`
            : 'Query returned 0 pairs for this filter.',
        );
        facts.push(
          'Blocker from live fields: absence of a session_student_tutor_pairs row for this student (in scope).',
        );
        facts.push(
          'Creator / waiting-since / validation status: data unavailable on unmatched students.',
        );
      }

      if (args.sessionId) {
        const candidatesCall = await softCall(
          'GET /sessions/:id/assignment-candidates',
          () => this.matching.getAssignmentCandidates(args.sessionId!),
        );
        warnings.push(...collectWarnings(candidatesCall));
        if (candidatesCall.ok && candidatesCall.data) {
          const candidates = candidatesCall.data;
          const inStudents = args.studentId
            ? candidates.students.some((s) => s.id === args.studentId)
            : candidates.students.some((s) =>
                personLabel(s)
                  .toLowerCase()
                  .includes((args.name || studentLabel).toLowerCase()),
              );
          facts.push(
            inStudents
              ? `On focused session: student appears in assignment-candidates (${candidates.students.length} students, ${candidates.tutors.length} tutors eligible).`
              : `On focused session: student not listed in assignment-candidates (${candidates.students.length} students / ${candidates.tutors.length} tutors returned) — eligibility filters may exclude them (establishment, subject, availability).`,
          );
          facts.push(
            `Eligible tutors available on session: ${candidates.tutors.length}.`,
          );
          if (candidates.tutors.length) {
            facts.push(
              '| Eligible tutor | Note |',
              '| --- | --- |',
              ...candidates.tutors
                .slice(0, 12)
                .map(
                  (t) =>
                    `| ${personLabel(t) || '—'} | assignment-candidate |`,
                ),
            );
          }
          if (!related.length) {
            facts.push(
              candidates.tutors.length
                ? 'Next action: Assign tutor from eligible candidates on the session.'
                : 'Next action: View tutor availability / enlarge eligible tutor pool (subject, créneau, établissement).',
            );
          }
        } else {
          facts.push(
            candidatesCall.warning
              ? `PARTIAL: ${candidatesCall.warning}`
              : 'Session assignment-candidates: unavailable for deeper eligibility diagnosis.',
          );
        }
      } else if (!related.length) {
        facts.push(
          'Eligibility vs available tutors: open a session context to load assignment-candidates (session-scoped).',
        );
        facts.push('Next action: Assign tutor from Matching / session configure view.');
      }

      facts.push(
        'Hybrid note: functional Matching rules (binôme cœur, auto-balanced, availability) come from documentation when cited — do not invent rules beyond live fields above.',
      );

      return {
        skillId: this.id,
        ok: true,
        operation: related.length
          ? 'student_matched_diagnosis'
          : 'student_unmatched_diagnosis',
        data: { studentLabel, pairs: related.map(redactPair) },
        facts,
        warnings: warnings.length ? warnings : undefined,
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'why_not_matched_partial',
        data: null,
        facts: answerFacts({
          answer: `Matching diagnosis for “${studentLabel}” is incomplete because a live Matching call failed.`,
          explanation: safeErrorMessage(error),
          reasoning:
            'A timeout is not “information not found in documents”. Use the page selection and retry.',
          next: 'Open Matching for this student, or ask again after selecting them.',
          source: 'GET /sessions/student-tutor-pairs',
        }),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async studentsWaiting(q: string): Promise<SkillResult> {
    const wantsOver30 = /\b(30|trente)\b/i.test(q);
    try {
      // Waiting duration requires an unmatched-since / matched_at wait start — not on pair list.
      const unmatched = await this.unmatchedStudents(
        this.academic.resolveFocusedSessionId(),
      );
      const facts = [
        ...(unmatched.facts ?? []),
        wantsOver30
          ? 'Students waiting > 30 days: data unavailable — no unmatched-since / wait-start date on Matching or student list APIs used here.'
          : 'Students waiting longest: data unavailable — no wait-start date to rank unmatched duration.',
        'Do not invent wait durations from pair createdAt (that field dates an existing pair, not unmatched wait).',
        'Next action: Notify coordinator to triage unmatched students from Matching manually if SLA tracking is required outside Ednov.',
      ];
      return {
        skillId: this.id,
        ok: true,
        operation: 'students_waiting_unavailable_dates',
        data: unmatched.data,
        facts,
        warnings: unmatched.warnings,
      };
    } catch (error) {
      return matchingPartial(this.id, 'students_waiting_partial', error, [
        'Wait duration fields: data unavailable on Matching APIs.',
      ]);
    }
  }

  private async tutorsHighestWorkload(): Promise<SkillResult> {
    try {
      const page = await this.matching.listPairsPage({ page: 1, pageSize: 100 });
      const counts = new Map<
        string,
        { label: string; count: number; sessionCountMax: number }
      >();

      for (const pair of page.pairs) {
        const tutorId = pair.tutorUserId || pair.tutor?.id;
        if (!tutorId) continue;
        const label = personLabel(pair.tutor) || 'Tutor';
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
      const facts: string[] = [
        `Tutor workload from live pair sample (${page.pairs.length} pairs` +
          (page.total != null ? `, API total ${page.total}` : '') +
          '):',
        ranked.length
          ? '| Rank | Tutor | Pair rows in sample | Max sessionCount on rows |'
          : 'No tutor workload could be derived (empty pair sample).',
        ranked.length ? '| --- | --- | --- | --- |' : '',
        ...ranked
          .slice(0, 15)
          .map(
            (row, i) =>
              `| ${i + 1} | ${row.label} | ${row.count} | ${
                row.sessionCountMax > 0 ? row.sessionCountMax : '—'
              } |`,
          ),
        'Workload here = count of pair rows in the authorization-scoped sample (and sessionCount when present) — not a separate capacity metric.',
        page.total != null && page.total > page.pairs.length
          ? `Sample covers ${page.pairs.length}/${page.total} pairs — ranking may be incomplete.`
          : '',
        'Next action: View tutor availability / balance assignments on Matching.',
      ].filter(Boolean);

      return {
        skillId: this.id,
        ok: true,
        operation: 'tutor_workload_ranking',
        data: { ranked: ranked.slice(0, 15), sampleSize: page.pairs.length },
        facts,
      };
    } catch (error) {
      return matchingPartial(this.id, 'tutor_workload_partial', error);
    }
  }

  private async studentMatchingLookup(args: {
    studentId?: string;
    name?: string | null;
    labelHint?: string;
  }): Promise<SkillResult> {
    let studentLabel = args.labelHint || args.name || 'focused student';
    if (args.studentId) {
      studentLabel = await this.safeStudentLabel(args.studentId, studentLabel);
    }

    try {
      const pairsPage = await this.matching.listPairsPage({
        page: 1,
        pageSize: 20,
        ...(args.studentId ? { studentId: args.studentId } : {}),
        ...(args.name && !args.studentId ? { search: args.name } : {}),
      });
      const related = pairsPage.pairs;
      return {
        skillId: this.id,
        ok: true,
        operation: 'student_matching_lookup',
        data: { studentLabel, pairs: related.map(redactPair) },
        facts: [
          `Matching lookup for student “${studentLabel}”.`,
          related.length
            ? `Found ${related.length} pair(s):`
            : 'No pair for this student in the live Matching query.',
          related.length
            ? '| Student | Tutor | Origin | Session status | Created |'
            : '',
          related.length ? '| --- | --- | --- | --- | --- |' : '',
          ...related.slice(0, 15).map((p) => pairTableRow(p)),
          related.length
            ? ''
            : 'Next action: Assign tutor or open student profile to continue.',
        ].filter(Boolean),
      };
    } catch (error) {
      return matchingPartial(this.id, 'student_matching_lookup_partial', error);
    }
  }

  private async tutorMatchingLookup(
    tutorId: string,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    const label =
      ctx.applicationContext?.tutor?.label?.trim() || 'focused tutor';
    try {
      const pairsPage = await this.matching.listPairsPage({
        page: 1,
        pageSize: 30,
        tutorId,
      });
      return {
        skillId: this.id,
        ok: true,
        operation: 'tutor_matching_lookup',
        data: { label, pairs: pairsPage.pairs.map(redactPair) },
        facts: [
          `Matching pairs for tutor “${label}”: ${pairsPage.pairs.length}` +
            (pairsPage.total != null ? ` (API total ${pairsPage.total})` : '') +
            '.',
          pairsPage.pairs.length
            ? '| Student | Tutor | Origin | Session status | Created |'
            : 'No pairs for this tutor in scope.',
          pairsPage.pairs.length ? '| --- | --- | --- | --- | --- |' : '',
          ...pairsPage.pairs.slice(0, 15).map((p) => pairTableRow(p)),
          'Next action: View tutor availability or Generate matching report from these rows.',
        ].filter(Boolean),
      };
    } catch (error) {
      return matchingPartial(this.id, 'tutor_matching_lookup_partial', error);
    }
  }

  private async sessionMatching(
    sessionId: string,
    ctx: SkillExecutionContext,
  ): Promise<SkillResult> {
    try {
      const [participants, candidates, pairsPage] = await Promise.all([
        this.academic.getSessionParticipants(sessionId),
        this.matching.getAssignmentCandidates(sessionId).catch(() => null),
        this.matching.listPairsPage({ page: 1, pageSize: 50, sessionId }),
      ]);
      const sessionLabel =
        ctx.applicationContext?.session?.label?.trim() || 'focused session';
      const unmatchedCount =
        candidates && candidates.students.length
          ? candidates.students.filter(
              (s) =>
                s.id &&
                !pairsPage.pairs.some(
                  (p) =>
                    p.studentUserId === s.id || p.student?.id === s.id,
                ),
            ).length
          : null;

      return {
        skillId: this.id,
        ok: true,
        operation: 'session_matching',
        data: {
          participants,
          candidates,
          pairs: pairsPage.pairs.map(redactPair),
        },
        facts: [
          `Matching context for session “${sessionLabel}”.`,
          `Pairs on session (live): ${pairsPage.pairs.length}` +
            (pairsPage.total != null ? ` / total ${pairsPage.total}` : '') +
            '.',
          candidates
            ? `Assignment candidates: ${candidates.students.length} students, ${candidates.tutors.length} tutors (eligibility-filtered).`
            : 'Assignment candidates unavailable for this session.',
          unmatchedCount != null
            ? `Unmatched eligible students on session: ${unmatchedCount}.`
            : '',
          pairsPage.pairs.length
            ? '| Student | Tutor | Origin | Session status | Created |'
            : '',
          pairsPage.pairs.length ? '| --- | --- | --- | --- | --- |' : '',
          ...pairsPage.pairs.slice(0, 12).map((p) => pairTableRow(p)),
          'Use live rows only — do not invent pairings.',
          'Next action: Assign tutor for unmatched eligible students, or View tutor availability.',
        ].filter(Boolean),
      };
    } catch (error) {
      return matchingPartial(this.id, 'session_matching_partial', error);
    }
  }

  private async matchingOverview(): Promise<SkillResult> {
    try {
      const page = await this.matching.listPairsPage({ page: 1, pageSize: 20 });
      return {
        skillId: this.id,
        ok: true,
        operation: 'matching_overview',
        data: page.pairs.map(redactPair),
        facts: [
          `Matching pairs overview (${page.pairs.length}` +
            (page.total != null ? ` of ${page.total}` : '') +
            ', authorization-scoped):',
          '',
          '| Student | Tutor | Origin | Session status | Created |',
          '| --- | --- | --- | --- | --- |',
          ...page.pairs.slice(0, 15).map((p) => pairTableRow(p)),
          page.pairs.length
            ? 'Ask about unmatched students, available tutors, workload, or a selected binôme for deeper live analysis.'
            : 'No pairs returned — open Matching or a session to continue.',
          'Functional Matching docs (binôme cœur, auto-assignment) may be cited when hybrid retrieval returns them.',
        ],
      };
    } catch (error) {
      return matchingPartial(this.id, 'pairs_unavailable_partial', error);
    }
  }

  private async safeStudentLabel(
    studentId: string,
    fallback = 'focused student',
  ): Promise<string> {
    try {
      const s = await this.users.findStudentById(studentId);
      return displayName(s);
    } catch {
      return fallback;
    }
  }
}

function matchingPartial(
  skillId: BusinessSkillId,
  operation: string,
  error: unknown,
  extra: string[] = [],
): SkillResult {
  return {
    skillId,
    ok: true,
    operation,
    data: null,
    facts: [
      ...apiPartialFacts('Matching', error),
      ...extra,
    ],
    warnings: [safeErrorMessage(error)],
  };
}

function asksUnmatched(q: string): boolean {
  return /\b(unmatched|without a tutor|sans tuteur|non.?appari|pas de tuteur|no tutor|élèves? non|eleves? non|without matching|sans matching|sans appariement|students? without matching|élèves? sans matching)\b/i.test(
    q,
  );
}

function asksAvailableTutors(q: string): boolean {
  return (
    (/\b(available|disponibles?|éligibles?|eligibles?|availability|disponibilité)\b/i.test(
      q,
    ) &&
      /\b(tutor|tuteur)/i.test(q)) ||
    /\b(tutors? available|tuteurs? disponibles?)\b/i.test(q)
  );
}

function asksCountActive(q: string): boolean {
  return (
    /\b(how many|combien|count|nombre)\b/i.test(q) &&
    /\b(match|matching|pair|binôme|binome|appari)/i.test(q)
  );
}

function asksWhyNotMatched(q: string): boolean {
  return /\b(why.{0,80}match|pourquoi.{0,80}(match|appari|tuteur)|isn['’]?t.{0,40}match|can['’]?t.{0,40}match|cannot.{0,40}match|not matched|pas.?appari|bloqué|bloque|why isn['’]?t this student)\b/i.test(
    q,
  );
}

function asksWhoCanMatch(q: string): boolean {
  return /\b(who can (be )?match|qui (peut|pourrait) .{0,40}(appari|match)|eligible tutors?|tuteurs? (éligibles?|eligibles?)|who (?:could|should) (?:be )?pair)\b/i.test(
    q,
  );
}

function asksStatus(q: string): boolean {
  return /\b(status|statut|état|etat|situation)\b/i.test(q);
}

function asksCreator(q: string): boolean {
  return /\b(who created|qui a (créé|cree|créée|creee)|created by|créé par|cree par|when created|quand.*(créé|cree)|date de création|date de creation)\b/i.test(
    q,
  );
}

function asksPendingValidation(q: string): boolean {
  if (
    /\b(report|reports|compte.?rendu|comptes?-?rendus?|\bcr\b)\b/i.test(q)
  ) {
    return false;
  }
  return (
    /\b(pending validation|en attente de validation|à valider|a valider|validation pending)\b/i.test(
      q,
    ) && /\b(match|matching|binôme|binome|pair|appariement)\b/i.test(q)
  );
}

function asksWaiting(q: string): boolean {
  if (
    /\b(report|reports|compte.?rendu|comptes?-?rendus?|à valider|a valider|en attente de validation)\b/i.test(
      q,
    )
  ) {
    return false;
  }
  return /\b(waiting|attendent|attente|longest wait|plus longtemps|30 days|30 jours)\b/i.test(
    q,
  );
}

function asksWorkload(q: string): boolean {
  return (
    /\b(workload|charge|plus d['’]?élèves|plus d['’]?eleves|most students|highest|plus de binômes|plus de binomes)\b/i.test(
      q,
    ) && /\b(tutor|tuteur)/i.test(q)
  );
}

function personLabel(
  row?: {
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  } | null,
): string {
  if (!row) return '';
  return displayName(row);
}

function sourceLabel(source?: string | null): string {
  if (!source) return '—';
  switch (source) {
    case 'manual':
      return 'manual';
    case 'auto_binome_coeur':
      return 'auto_binome_coeur';
    case 'auto_balanced':
      return 'auto_balanced';
    case 'auto_history':
      return 'auto_history';
    default:
      return source;
  }
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

function pairTableRow(p: StudentTutorPair): string {
  return `| ${personLabel(p.student) || '—'} | ${personLabel(p.tutor) || '—'} | ${
    p.assignmentSource ? sourceLabel(p.assignmentSource) : p.status ?? '—'
  } | ${p.session?.status ?? '—'} | ${formatDate(p.createdAt) ?? '—'} |`;
}

function pairFacts(pair: StudentTutorPair, title: string): string[] {
  const studentLabel = personLabel(pair.student) || 'Student';
  const tutorLabel = personLabel(pair.tutor) || 'Tutor';
  return [
    `${title}: ${studentLabel} ↔ ${tutorLabel}.`,
    pair.assignmentSource
      ? `Assignment origin: ${sourceLabel(pair.assignmentSource)}.`
      : 'Assignment origin: data unavailable.',
    pair.session?.status
      ? `Session status: ${pair.session.status}.`
      : 'Session status: data unavailable.',
    formatDate(pair.createdAt)
      ? `Created at: ${formatDate(pair.createdAt)}.`
      : 'Created at: data unavailable.',
    'Creator user: data unavailable on pairs API.',
    '',
    '| Student | Tutor | Origin | Session status | Created |',
    '| --- | --- | --- | --- | --- |',
    pairTableRow(pair),
  ];
}

/** Strip ids from skill `data` payloads used downstream (facts already label-only). */
function redactPair(pair: StudentTutorPair): Record<string, unknown> {
  return {
    student: personLabel(pair.student) || null,
    tutor: personLabel(pair.tutor) || null,
    assignmentSource: pair.assignmentSource ?? null,
    sessionStatus: pair.session?.status ?? null,
    createdAt: formatDate(pair.createdAt),
    sessionCount: pair.sessionCount ?? null,
  };
}
