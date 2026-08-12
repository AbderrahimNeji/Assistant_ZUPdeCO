import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, SelectQueryBuilder, Brackets } from 'typeorm';
import { VisibilityScopeResolverService } from './visibility-scope-resolver.service';
import { VisibilityScope } from './visibility-scope.types';
import { EntityType } from './entity-relation-registry';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Creates a fresh chainable mock QueryBuilder. */
function createMockQb() {
  const qb = {
    andWhere: jest.fn(),
    leftJoin: jest.fn(),
  };
  qb.andWhere.mockReturnValue(qb);
  qb.leftJoin.mockReturnValue(qb);
  return qb as unknown as jest.Mocked<SelectQueryBuilder<Record<string, unknown>>>;
}

const USER_CTX = { userId: 'user-1', companyId: 'company-1' };

// ─── suite ────────────────────────────────────────────────────────────────────

describe('VisibilityScopeResolverService', () => {
  let service: VisibilityScopeResolverService;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisibilityScopeResolverService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<VisibilityScopeResolverService>(VisibilityScopeResolverService);
  });

  // ─── resolveEstablishmentIds ───────────────────────────────────────────────

  describe('resolveEstablishmentIds', () => {
    it('returns IDs fetched from user_establishments', async () => {
      dataSource.query.mockResolvedValue([{ value: 'est-1' }, { value: 'est-2' }]);

      const result = await service.resolveEstablishmentIds('user-1', 'company-1');

      expect(result).toEqual(['est-1', 'est-2']);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('user_establishments'),
        ['user-1'],
      );
    });

    it('returns empty array when the user has no establishments', async () => {
      dataSource.query.mockResolvedValue([]);

      expect(await service.resolveEstablishmentIds('user-1', 'company-1')).toEqual([]);
    });

    it('filters out null / empty values from DB rows', async () => {
      dataSource.query.mockResolvedValue([
        { value: 'est-1' },
        { value: null },
        { value: '' },
        { value: 'est-3' },
      ]);

      expect(await service.resolveEstablishmentIds('user-1', 'company-1')).toEqual([
        'est-1',
        'est-3',
      ]);
    });
  });

  // ─── resolveAssignedSessionIds ─────────────────────────────────────────────

  describe('resolveAssignedSessionIds', () => {
    it('returns session IDs from both session_participants and assignments', async () => {
      dataSource.query.mockResolvedValue([
        { value: 'session-1' },
        { value: 'session-2' },
      ]);

      const result = await service.resolveAssignedSessionIds('user-1', 'company-1');

      expect(result).toEqual(['session-1', 'session-2']);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('session_participants'),
        ['user-1'],
      );
    });

    it('returns empty array when the user has no assigned sessions', async () => {
      dataSource.query.mockResolvedValue([]);

      expect(await service.resolveAssignedSessionIds('user-1', 'company-1')).toEqual([]);
    });
  });

  // ─── applyToQueryBuilder — no-op cases ────────────────────────────────────

  describe('applyToQueryBuilder — no-op cases', () => {
    it('does nothing when scope is null', async () => {
      const qb = createMockQb();
      await service.applyToQueryBuilder(qb, null, 'sessions', USER_CTX);
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.leftJoin).not.toHaveBeenCalled();
    });

    it('does nothing when scope is undefined', async () => {
      const qb = createMockQb();
      await service.applyToQueryBuilder(qb, undefined, 'sessions', USER_CTX);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('does nothing when scope is "unrestricted"', async () => {
      const qb = createMockQb();
      await service.applyToQueryBuilder(
        qb,
        { scope: 'unrestricted' },
        'sessions',
        USER_CTX,
      );
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ─── applyToQueryBuilder — same_establishment ─────────────────────────────

  describe('applyToQueryBuilder — same_establishment', () => {
    const scope: VisibilityScope = { scope: 'same_establishment' };

    it('applies "1 = 0" when the user has no establishments', async () => {
      dataSource.query.mockResolvedValue([]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);

      expect(qb.andWhere).toHaveBeenCalledWith('1 = 0');
    });

    it('applies establishment_id IN condition for sessions entity', async () => {
      dataSource.query.mockResolvedValue([{ value: 'est-1' }, { value: 'est-2' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/session\.establishment_id IN/),
        expect.any(Object),
      );
      // sessions has no join in the registry — leftJoin must NOT be called
      expect(qb.leftJoin).not.toHaveBeenCalled();
    });

    it('adds a leftJoin and establishment condition for users entity', async () => {
      dataSource.query.mockResolvedValue([{ value: 'est-1' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'users', USER_CTX);

      expect(qb.leftJoin).toHaveBeenCalledWith(
        'user_establishments',
        'vs_ue',
        'vs_ue.user_id = user.id',
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/vs_ue\.establishment_id IN/),
        expect.any(Object),
      );
    });

    it('adds a join + establishment condition for reports entity', async () => {
      dataSource.query.mockResolvedValue([{ value: 'est-1' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'reports', USER_CTX);

      expect(qb.leftJoin).toHaveBeenCalledWith(
        'sessions',
        'vs_report_session',
        'vs_report_session.id = report.session_id',
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/vs_report_session\.establishment_id IN/),
        expect.any(Object),
      );
    });

    it('passes the resolved establishment IDs as parameter', async () => {
      dataSource.query.mockResolvedValue([{ value: 'est-A' }, { value: 'est-B' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);

      // The param object must contain the estIds array
      const [, params] = (qb.andWhere as jest.Mock).mock.calls[0];
      expect(Object.values(params as object)).toEqual(
        expect.arrayContaining([['est-A', 'est-B']]),
      );
    });
  });

  // ─── applyToQueryBuilder — managed_by ─────────────────────────────────────

  describe('applyToQueryBuilder — managed_by', () => {
    const scope: VisibilityScope = { scope: 'managed_by' };

    it('applies managed_by condition for sessions entity (no join)', async () => {
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);

      expect(qb.leftJoin).not.toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/session\.managed_by =/),
        expect.any(Object),
      );
    });

    it('applies managed_by condition for users entity', async () => {
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'users', USER_CTX);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/user\.managed_by =/),
        expect.any(Object),
      );
    });

    it('applies managed_by condition for reports entity with a join', async () => {
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'reports', USER_CTX);

      expect(qb.leftJoin).toHaveBeenCalledWith(
        'sessions',
        'vs_mb_session',
        'vs_mb_session.id = report.session_id',
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/vs_mb_session\.managed_by =/),
        expect.any(Object),
      );
    });

    it('passes the userId as parameter value', async () => {
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);

      const [, params] = (qb.andWhere as jest.Mock).mock.calls[0];
      expect(Object.values(params as object)).toContain('user-1');
    });
  });

  // ─── applyToQueryBuilder — assignment ─────────────────────────────────────

  describe('applyToQueryBuilder — assignment', () => {
    const scope: VisibilityScope = { scope: 'assignment' };

    it('applies "1 = 0" when the user has no assigned sessions', async () => {
      dataSource.query.mockResolvedValue([]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);

      expect(qb.andWhere).toHaveBeenCalledWith('1 = 0');
    });

    it('applies session.id IN condition for sessions entity', async () => {
      dataSource.query.mockResolvedValue([{ value: 'sess-1' }, { value: 'sess-2' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/session\.id IN/),
        expect.any(Object),
      );
    });

    it('applies report.session_id IN condition for reports entity', async () => {
      dataSource.query.mockResolvedValue([{ value: 'sess-1' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'reports', USER_CTX);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/report\.session_id IN/),
        expect.any(Object),
      );
    });

    it('applies vsc_report.session_id IN condition for vscReports entity', async () => {
      dataSource.query.mockResolvedValue([{ value: 'sess-1' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'vscReports', USER_CTX);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/vsc_report\.session_id IN/),
        expect.any(Object),
      );
    });

    it('passes the resolved sessionIds as parameter', async () => {
      dataSource.query.mockResolvedValue([{ value: 'sess-A' }, { value: 'sess-B' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);

      const [, params] = (qb.andWhere as jest.Mock).mock.calls[0];
      expect(Object.values(params as object)).toEqual(
        expect.arrayContaining([['sess-A', 'sess-B']]),
      );
    });

    it('does not call leftJoin for sessions or reports entities', async () => {
      dataSource.query.mockResolvedValue([{ value: 'sess-1' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(qb, scope, 'sessions', USER_CTX);
      expect(qb.leftJoin).not.toHaveBeenCalled();

      jest.clearAllMocks();
      qb.andWhere.mockReturnValue(qb);

      await service.applyToQueryBuilder(qb, scope, 'reports', USER_CTX);
      expect(qb.leftJoin).not.toHaveBeenCalled();
    });
  });

  // ─── applyToQueryBuilder — same_establishment_or_managed_by ───────────────

  describe('applyToQueryBuilder — same_establishment_or_managed_by', () => {
    it('falls back to managed_by only when user has no establishments', async () => {
      dataSource.query.mockResolvedValue([]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(
        qb,
        { scope: 'same_establishment_or_managed_by', operator: 'OR' },
        'sessions',
        USER_CTX,
      );

      // managed_by condition should be applied directly (not wrapped in Brackets)
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/session\.managed_by =/),
        expect.any(Object),
      );
    });

    it('wraps conditions in a Brackets instance for OR operator', async () => {
      dataSource.query.mockResolvedValue([{ value: 'est-1' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(
        qb,
        { scope: 'same_establishment_or_managed_by', operator: 'OR' },
        'sessions',
        USER_CTX,
      );

      // The Brackets (OR wrapper) is passed to andWhere
      const calls = (qb.andWhere as jest.Mock).mock.calls;
      const hasBracketsCall = calls.some(([arg]) => arg instanceof Brackets);
      expect(hasBracketsCall).toBe(true);
    });

    it('applies both conditions separately for AND operator', async () => {
      dataSource.query.mockResolvedValue([{ value: 'est-1' }]);
      const qb = createMockQb();

      await service.applyToQueryBuilder(
        qb,
        { scope: 'same_establishment_or_managed_by', operator: 'AND' },
        'sessions',
        USER_CTX,
      );

      // For AND, two separate andWhere calls (no Brackets)
      expect(qb.andWhere).toHaveBeenCalledTimes(2);
      const calls = (qb.andWhere as jest.Mock).mock.calls;
      const hasBracketsCall = calls.some(([arg]) => arg instanceof Brackets);
      expect(hasBracketsCall).toBe(false);
    });

    it('defaults to OR operator when none is specified', async () => {
      dataSource.query.mockResolvedValue([{ value: 'est-1' }]);
      const qb = createMockQb();

      // No operator → should default to OR → Brackets
      await service.applyToQueryBuilder(
        qb,
        { scope: 'same_establishment_or_managed_by' },
        'sessions',
        USER_CTX,
      );

      const calls = (qb.andWhere as jest.Mock).mock.calls;
      expect(calls.some(([arg]) => arg instanceof Brackets)).toBe(true);
    });
  });

  // ─── EntityType coverage ──────────────────────────────────────────────────

  describe('entity type coverage', () => {
    const entityTypes: EntityType[] = ['sessions', 'reports', 'vscReports', 'users'];

    it.each(entityTypes)(
      'same_establishment applies a condition for entity type "%s"',
      async (entityType) => {
        dataSource.query.mockResolvedValue([{ value: 'est-1' }]);
        const qb = createMockQb();

        await service.applyToQueryBuilder(
          qb,
          { scope: 'same_establishment' },
          entityType,
          USER_CTX,
        );

        expect(qb.andWhere).toHaveBeenCalled();
      },
    );

    it.each(['sessions', 'reports', 'vscReports'] as EntityType[])(
      'assignment applies a condition for entity type "%s"',
      async (entityType) => {
        dataSource.query.mockResolvedValue([{ value: 'sess-1' }]);
        const qb = createMockQb();

        await service.applyToQueryBuilder(
          qb,
          { scope: 'assignment' },
          entityType,
          USER_CTX,
        );

        expect(qb.andWhere).toHaveBeenCalled();
      },
    );
  });

  // ─── compileRulesToScope (dashboard rules[] normalisation) ────────────────

  describe('compileRulesToScope', () => {
    it('maps admin-like default rule with read=null to unrestricted', () => {
      const compiled = service.compileRulesToScope({
        rules: [{ id: 'rule-default', read: null, actions: [], entityFilter: null }],
      });
      expect(compiled.scope).toBe('unrestricted');
      expect(compiled.relations ?? []).toEqual([]);
    });

    it('maps default rule with read.relations to relation_overlap', () => {
      const compiled = service.compileRulesToScope({
        rules: [
          {
            id: 'rule-default',
            read: { relations: ['establishment'], logic: 'OR' },
            actions: [],
            entityFilter: null,
          },
        ],
      });
      expect(compiled).toEqual({
        scope: 'relation_overlap',
        relations: ['establishment'],
        operator: 'OR',
        entityConditions: undefined,
      });
    });
  });
});
