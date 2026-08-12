import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

import { TtlCache } from '../../../common/cache/ttl-cache';
import { SkillAuditService } from '../../../common/security/skill-audit.service';
import { BusinessSkillRegistry } from '../skill.registry';
import {
  BusinessIntelligencePlan,
  BusinessSkillId,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';

const SENSITIVE_SKILLS = new Set<BusinessSkillId>([
  'matching',
  'registration',
  'student',
  'tutor',
  'attendance',
  'report',
  'parent',
  'user',
]);

const DEFAULT_TIMEOUT_MS = 22_000;
const CACHE_TTL_MS = 15_000;

export type SkillExecutorOptions = {
  timeoutMs?: number;
  bypassCache?: boolean;
};

export type SkillExecutorOutcome = {
  results: SkillResult[];
  cacheHit: boolean;
};

/**
 * Parallel skill runner with per-skill timeout, catch, in-flight dedupe,
 * and short TTL cache. Partial failures never abort the whole plan.
 */
@Injectable()
export class SkillExecutor {
  private readonly logger = new Logger(SkillExecutor.name);
  private readonly cache = new TtlCache<SkillResult[]>(CACHE_TTL_MS, 64);
  private readonly inflight = new Map<string, Promise<SkillResult[]>>();

  constructor(
    private readonly registry: BusinessSkillRegistry,
    private readonly audit: SkillAuditService,
  ) {}

  async execute(
    plan: BusinessIntelligencePlan,
    ctx: SkillExecutionContext,
    options?: SkillExecutorOptions,
  ): Promise<SkillExecutorOutcome> {
    const uniqueIds = [...new Set(plan.skillIds)];
    const cacheKey = this.buildCacheKey(
      ctx.user.userId,
      uniqueIds,
      ctx.question,
    );

    if (!options?.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { results: cached, cacheHit: true };
      }

      const pending = this.inflight.get(cacheKey);
      if (pending) {
        const results = await pending;
        return { results, cacheHit: true };
      }
    }

    const run = this.runSkills(
      uniqueIds,
      ctx,
      options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    this.inflight.set(cacheKey, run);

    try {
      const results = await run;
      this.cache.set(cacheKey, results, CACHE_TTL_MS);
      return { results, cacheHit: false };
    } finally {
      this.inflight.delete(cacheKey);
    }
  }

  private async runSkills(
    skillIds: BusinessSkillId[],
    ctx: SkillExecutionContext,
    timeoutMs: number,
  ): Promise<SkillResult[]> {
    return Promise.all(
      skillIds.map((id) => this.executeOne(id, ctx, timeoutMs)),
    );
  }

  private async executeOne(
    id: BusinessSkillId,
    ctx: SkillExecutionContext,
    timeoutMs: number,
  ): Promise<SkillResult> {
    const skill = this.registry.getById(id);
    if (!skill) {
      return {
        skillId: id,
        ok: false,
        operation: 'missing_skill',
        data: null,
        facts: [],
        warnings: [`Skill ${id} is not registered.`],
        durationMs: 0,
      };
    }

    const started = performance.now();
    try {
      const result = await this.withTimeout(skill.execute(ctx), timeoutMs, id);
      const durationMs = Math.round(performance.now() - started);
      this.maybeAudit(
        id,
        ctx.user.userId,
        result.ok,
        durationMs,
        result.operation,
      );
      return { ...result, durationMs };
    } catch (error) {
      const durationMs = Math.round(performance.now() - started);
      const message =
        error instanceof Error ? error.message : 'Skill execution failed';
      this.logger.warn(`Skill ${id} failed: ${message}`);
      this.maybeAudit(id, ctx.user.userId, false, durationMs, 'error', message);
      return {
        skillId: id,
        ok: false,
        operation: message.includes('timed out') ? 'timeout' : 'error',
        data: null,
        facts: [],
        warnings: [message],
        durationMs,
      };
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    skillId: BusinessSkillId,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(`Skill ${skillId} timed out after ${timeoutMs}ms`),
              ),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private maybeAudit(
    skillId: BusinessSkillId,
    userId: string,
    success: boolean,
    durationMs: number,
    action: string,
    reason?: string,
  ): void {
    if (!SENSITIVE_SKILLS.has(skillId)) return;
    void this.audit.record({
      type: 'business_skill_call',
      userId,
      skillId,
      success,
      meta: {
        action,
        durationMs,
        ...(reason ? { reason: reason.slice(0, 120) } : {}),
      },
    });
  }

  private buildCacheKey(
    userId: string,
    skillIds: BusinessSkillId[],
    question: string,
  ): string {
    const normalized = question.trim().toLowerCase().replace(/\s+/g, ' ');
    const hash = createHash('sha256')
      .update(`${userId}|${skillIds.join(',')}|${normalized}`)
      .digest('hex')
      .slice(0, 24);
    return `bqe:${hash}`;
  }
}
