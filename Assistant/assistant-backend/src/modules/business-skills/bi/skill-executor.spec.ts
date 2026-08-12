import { SkillExecutor } from './skill-executor';
import type { BusinessSkillRegistry } from '../skill.registry';
import type {
  BusinessIntelligencePlan,
  BusinessSkill,
  SkillExecutionContext,
  SkillResult,
} from '../skill.types';
import type { SkillAuditService } from '../../../common/security/skill-audit.service';

describe('SkillExecutor', () => {
  const user = {
    userId: 'u1',
    role: 'ADMIN' as const,
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.c',
  };

  const ctx: SkillExecutionContext = {
    user,
    question: 'How many students?',
    questionType: 'COUNT',
  };

  function makeSkill(
    id: 'student' | 'dashboard',
    impl: () => Promise<SkillResult>,
  ): BusinessSkill {
    return {
      id,
      domains: [],
      domainTags: [id],
      capabilities: ['count'],
      execute: impl,
    };
  }

  it('returns partial results when one skill fails', async () => {
    const student = makeSkill('student', () =>
      Promise.resolve({
        skillId: 'student',
        ok: true,
        operation: 'count',
        data: { n: 1 },
        facts: ['n=1'],
      }),
    );
    const dashboard = makeSkill('dashboard', () =>
      Promise.reject(new Error('upstream down')),
    );

    const registry = {
      getById: (id: string) =>
        id === 'student' ? student : id === 'dashboard' ? dashboard : undefined,
    } as unknown as BusinessSkillRegistry;

    const audit = { record: jest.fn() } as unknown as SkillAuditService;
    const executor = new SkillExecutor(registry, audit);

    const plan: BusinessIntelligencePlan = {
      questionType: 'COUNT',
      skillIds: ['student', 'dashboard'],
      rationale: 'test',
    };

    const { results, cacheHit } = await executor.execute(plan, ctx, {
      bypassCache: true,
    });
    expect(cacheHit).toBe(false);
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.skillId === 'student')?.ok).toBe(true);
    expect(results.find((r) => r.skillId === 'dashboard')?.ok).toBe(false);
    expect(results.find((r) => r.skillId === 'dashboard')?.operation).toBe(
      'error',
    );
  });

  it('times out a hung skill without blocking siblings', async () => {
    const student = makeSkill('student', () =>
      Promise.resolve({
        skillId: 'student',
        ok: true,
        operation: 'count',
        data: { n: 2 },
        facts: ['n=2'],
      }),
    );
    const dashboard = makeSkill(
      'dashboard',
      () =>
        new Promise<SkillResult>(() => {
          /* never resolves */
        }),
    );

    const registry = {
      getById: (id: string) =>
        id === 'student' ? student : id === 'dashboard' ? dashboard : undefined,
    } as unknown as BusinessSkillRegistry;

    const audit = { record: jest.fn() } as unknown as SkillAuditService;
    const executor = new SkillExecutor(registry, audit);

    const plan: BusinessIntelligencePlan = {
      questionType: 'COUNT',
      skillIds: ['student', 'dashboard'],
      rationale: 'test',
    };

    const { results } = await executor.execute(plan, ctx, {
      timeoutMs: 50,
      bypassCache: true,
    });

    expect(results.find((r) => r.skillId === 'student')?.ok).toBe(true);
    const failed = results.find((r) => r.skillId === 'dashboard');
    expect(failed?.ok).toBe(false);
    expect(failed?.operation).toBe('timeout');
  });
});
