import { Injectable } from '@nestjs/common';

import { UserAdapter, EdnovUserRow } from '../../integration/adapters/user.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';
import {
  answerFacts,
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

@Injectable()
export class UserSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'user';
  readonly domains = [
    /\b(who am i|mon profil|my profile|my account|mon compte|authenticated user|open the profile|ouvre (le )?profil|ouvrir (le )?profil)\b/i,
    /\b(open|ouvre|ouvrir|show|montre|affiche)\s+(the\s+)?(profil|profile|fiche|[A-ZÀ-Ÿ])/iu,
  ];
  readonly domainTags = ['user', 'profile'];
  readonly capabilities: SkillCapability[] = ['status', 'search'];

  constructor(private readonly users: UserAdapter) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      const q = ctx.question;
      const name = extractPersonName(q);
      const pageId =
        this.users.resolveFocusedStudentId() ||
        this.users.resolveFocusedTutorId() ||
        this.users.resolveFocusedUserId();
      const pageLabel =
        ctx.applicationContext?.student?.label?.trim() ||
        ctx.applicationContext?.tutor?.label?.trim() ||
        ctx.applicationContext?.selection?.primary?.label?.trim();

      if (asksOpenOrShowProfile(q) || name) {
        return this.openNamedOrFocusedProfile(q, pageId, pageLabel, name);
      }

      const me = await softCall('GET /users/login', () => this.users.getMe());
      if (!me.ok || !me.data) {
        return {
          skillId: this.id,
          ok: true,
          operation: 'current_user_fallback',
          data: {
            id: ctx.user.userId,
            email: ctx.user.email,
            role: ctx.user.role,
          },
          facts: answerFacts({
            answer: `Signed-in user (token bridge): ${ctx.user.firstName} ${ctx.user.lastName} (${ctx.user.role}).`,
            explanation:
              me.warning ??
              'GET /users/login was unavailable; using the Copilot auth bridge only.',
            next: 'Retry, or open My profile in Ednov.',
            source: 'auth bridge / GET /users/login',
          }),
          warnings: collectWarnings(me),
        };
      }
      const profile = this.users.toProfileShape(me.data, ctx.user.role);
      return {
        skillId: this.id,
        ok: true,
        operation: 'current_user',
        data: profile,
        facts: answerFacts({
          answer: `Authenticated user: ${profile.firstName} ${profile.lastName} (${profile.role}).`,
          explanation: 'GET /users/login for the current bearer.',
          next: 'Open My profile if you need to edit identity fields.',
          source: 'GET /users/login',
        }),
      };
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: {
          id: ctx.user.userId,
          email: ctx.user.email,
          role: ctx.user.role,
        },
        facts: answerFacts({
          answer: `Fallback identity from token bridge: ${ctx.user.firstName} ${ctx.user.lastName} (${ctx.user.role}).`,
          explanation: safeErrorMessage(error),
          next: 'Retry after refresh, or open My profile.',
          source: 'auth bridge',
        }),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async openNamedOrFocusedProfile(
    q: string,
    pageId: string | undefined,
    pageLabel: string | undefined,
    name: string | null,
  ): Promise<SkillResult> {
    const warnings: string[] = [];
    let userId = pageId;
    let label = pageLabel;
    let kind: 'student' | 'tutor' | 'user' = pageId
      ? this.users.resolveFocusedStudentId()
        ? 'student'
        : this.users.resolveFocusedTutorId()
          ? 'tutor'
          : 'user'
      : 'user';

    if (!userId && name) {
      const search = await softCall('GET /search/global', () =>
        this.users.globalSearch(name),
      );
      warnings.push(...collectWarnings(search));
      const student = search.data?.students[0];
      const tutor = search.data?.tutors[0];
      const hit = /\b(tutor|tuteur)\b/i.test(q) ? tutor ?? student : student ?? tutor;
      if (hit?.id) {
        userId = hit.id;
        label = displayName(hit);
        kind = student && hit.id === student.id ? 'student' : 'tutor';
        rememberProfile(`user:${userId}`, hit);
      }
    }

    if (!userId) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'open_profile_needs_entity',
        data: null,
        facts: ambiguousEntityFacts(
          /\b(tutor|tuteur)\b/i.test(q) ? 'tutor' : 'student',
        ),
      };
    }

    const cached = recallProfile<EdnovUserRow>(`user:${userId}`);
    const byRole =
      kind === 'tutor'
        ? await softCall('GET /users/tutors/:id', () =>
            this.users.findTutorById(userId!),
          )
        : kind === 'student'
          ? await softCall('GET /users/students/:id', () =>
              this.users.findStudentById(userId!),
            )
          : await softCall('GET /users/:id', () =>
              this.users.getUserById(userId!),
            );
    warnings.push(...collectWarnings(byRole));
    let row = byRole.data;
    if (byRole.forbidden) {
      row = null;
    } else if (!row && name && !byRole.forbidden) {
      const search = await softCall('GET /search/global', () =>
        this.users.globalSearch(name),
      );
      warnings.push(...collectWarnings(search));
      row =
        search.data?.students.find((s) => s.id === userId) ??
        search.data?.tutors.find((t) => t.id === userId) ??
        null;
      if (row) logFallback('GET /users/:role/:id', 'GET /search/global');
    }
    if (!row && cached && byRole.timedOut) {
      warnings.push('Using recently cached profile because live GET timed out.');
      logFallback('GET /users/:role/:id', 'cached profile');
      row = cached;
    }

    if (!row) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'open_profile_partial',
        data: null,
        facts: answerFacts({
          answer: `Could not load the live profile${label ? ` for “${label}”` : ''}.`,
          explanation: warnings.join(' ') || 'Users / search endpoints returned no row.',
          reasoning: 'A timeout is not “information not found in documents”.',
          next: 'Select the person on the Ednov page and ask again.',
          source: 'GET /users/:role/:id',
        }),
        warnings,
      };
    }

    rememberProfile(`user:${userId}`, row);
    const est =
      row.userEstablishments?.[0]?.establishment?.name?.trim() || '—';
    return {
      skillId: this.id,
      ok: true,
      operation: 'open_profile',
      data: row,
      facts: answerFacts({
        answer: `${displayName(row)} — ${kind}, status ${row.status ?? 'n/a'}, establishment ${est}.`,
        explanation:
          'Page context first, else GET /search/global, then role-specific Users GET.',
        reasoning:
          'Opening a profile is a live Users lookup. Partial fields stay listed when a follow-up endpoint times out.',
        next: 'Open the fiche in Ednov, or ask about matching / sessions for this person.',
        source: 'GET /search/global + GET /users/:role/:id',
        extra: [
          ...warnings.map((w) => `PARTIAL: ${w}`),
        ],
      }),
    };
  }
}
