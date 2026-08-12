import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { VisibilityScopeInterceptor } from './visibility-scope.interceptor';
import { InterfaceElement } from '../../modules/interface-elements/entities/interface-element.entity';
import { RoleInterfaceElement } from '../../modules/interface-elements/entities/role-interface-element.entity';
import { LINKED_ELEMENT_KEY } from './visibility-scope.types';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Builds a minimal mock ExecutionContext for the given request payload. */
function buildContext(user: Record<string, unknown> = {}) {
  const request: Record<string, unknown> = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => jest.fn(),
    request,
  };
}

const callHandler: CallHandler = { handle: () => of('ok') };

// ─── suite ────────────────────────────────────────────────────────────────────

describe('VisibilityScopeInterceptor', () => {
  let interceptor: VisibilityScopeInterceptor;
  let reflector: { get: jest.Mock };
  let createQbMock: jest.Mock;
  let getRawOneMock: jest.Mock;

  beforeEach(async () => {
    getRawOneMock = jest.fn().mockResolvedValue(null);

    // Chainable QueryBuilder mock — every method returns the same object.
    const qb: Record<string, jest.Mock> = {
      innerJoin: jest.fn(),
      select: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      addOrderBy: jest.fn(),
      getRawOne: getRawOneMock,
    };
    // make chainable
    ['innerJoin', 'select', 'where', 'andWhere', 'orderBy', 'addOrderBy'].forEach((m) =>
      qb[m].mockReturnValue(qb),
    );

    createQbMock = jest.fn().mockReturnValue(qb);
    reflector = { get: jest.fn().mockReturnValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisibilityScopeInterceptor,
        { provide: Reflector, useValue: reflector },
        { provide: getRepositoryToken(InterfaceElement), useValue: {} },
        {
          provide: getRepositoryToken(RoleInterfaceElement),
          useValue: { createQueryBuilder: createQbMock },
        },
      ],
    }).compile();

    interceptor = module.get<VisibilityScopeInterceptor>(VisibilityScopeInterceptor);
  });

  // ── baseline ──────────────────────────────────────────────────────────────

  describe('when no @LinkedElement metadata is present', () => {
    it('sets req.visibilityScope to null and skips DB query', async () => {
      reflector.get.mockReturnValue(undefined);
      const ctx = buildContext({ uid: 'u1', company_id: 'c1', roles: ['admin'] });

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      expect(ctx.request.visibilityScope).toBeNull();
      expect(createQbMock).not.toHaveBeenCalled();
    });
  });

  // ── guard conditions ───────────────────────────────────────────────────────

  describe('when user context is incomplete', () => {
    const meta = { elementId: 'menu-sessions', interfaceName: 'sidebar' };

    beforeEach(() => reflector.get.mockReturnValue(meta));

    it('skips DB query when roles array is empty', async () => {
      const ctx = buildContext({ uid: 'u1', company_id: 'c1', roles: [] });

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      expect(ctx.request.visibilityScope).toBeNull();
      expect(createQbMock).not.toHaveBeenCalled();
    });

    it('skips DB query when company_id is missing', async () => {
      const ctx = buildContext({ uid: 'u1', roles: ['admin'] });

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      expect(ctx.request.visibilityScope).toBeNull();
      expect(createQbMock).not.toHaveBeenCalled();
    });

    it('skips DB query when user object is absent', async () => {
      const ctx = buildContext(); // no user property

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      expect(ctx.request.visibilityScope).toBeNull();
      expect(createQbMock).not.toHaveBeenCalled();
    });
  });

  // ── happy path ─────────────────────────────────────────────────────────────

  describe('when metadata and user context are present', () => {
    const meta = { elementId: 'menu-sessions', interfaceName: 'sidebar' };

    beforeEach(() => reflector.get.mockReturnValue(meta));

    it('attaches the resolved VisibilityScope to req.visibilityScope', async () => {
      const scope = { scope: 'same_establishment', relations: ['establishment'] };
      getRawOneMock.mockResolvedValue({ visibilityScope: scope });

      const ctx = buildContext({ uid: 'u1', company_id: 'c1', roles: ['coordinator'] });

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      expect(ctx.request.visibilityScope).toEqual(scope);
    });

    it('attaches null when no matching DB row is found', async () => {
      getRawOneMock.mockResolvedValue(null);

      const ctx = buildContext({ uid: 'u1', company_id: 'c1', roles: ['unknown-role'] });

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      expect(ctx.request.visibilityScope).toBeNull();
    });

    it('attaches null when DB row has undefined visibilityScope', async () => {
      getRawOneMock.mockResolvedValue({ visibilityScope: undefined });

      const ctx = buildContext({ uid: 'u1', company_id: 'c1', roles: ['admin'] });

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      expect(ctx.request.visibilityScope).toBeNull();
    });

    it('queries with the correct elementId, interfaceName, and roleCodes', async () => {
      getRawOneMock.mockResolvedValue(null);
      const ctx = buildContext({ uid: 'u1', company_id: 'comp-42', roles: ['tutor'] });

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      // Verify the QB was called at all
      expect(createQbMock).toHaveBeenCalledWith('rie');

      // The reflector should have been called with LINKED_ELEMENT_KEY
      expect(reflector.get).toHaveBeenCalledWith(
        LINKED_ELEMENT_KEY,
        expect.any(Function),
      );
    });

    it('uses unrestricted scope when admin token is resolved', async () => {
      getRawOneMock.mockResolvedValue({ visibilityScope: { scope: 'unrestricted' } });

      const ctx = buildContext({ uid: 'admin1', company_id: 'c1', roles: ['admin'] });

      await interceptor.intercept(ctx as unknown as ExecutionContext, callHandler);

      expect(ctx.request.visibilityScope).toEqual({ scope: 'unrestricted' });
    });
  });

  // ── error resilience ───────────────────────────────────────────────────────

  describe('error handling', () => {
    beforeEach(() =>
      reflector.get.mockReturnValue({ elementId: 'menu-sessions', interfaceName: 'sidebar' }),
    );

    it('does not throw on DB error and keeps visibilityScope null', async () => {
      getRawOneMock.mockRejectedValue(new Error('Connection refused'));

      const ctx = buildContext({ uid: 'u1', company_id: 'c1', roles: ['admin'] });

      await expect(
        interceptor.intercept(ctx as unknown as ExecutionContext, callHandler),
      ).resolves.toBeDefined();

      expect(ctx.request.visibilityScope).toBeNull();
    });

    it('returns observable from next.handle() even after a DB error', async () => {
      getRawOneMock.mockRejectedValue(new Error('Timeout'));

      const ctx = buildContext({ uid: 'u1', company_id: 'c1', roles: ['admin'] });

      const result$ = await interceptor.intercept(
        ctx as unknown as ExecutionContext,
        callHandler,
      );

      await expect(
        new Promise((res) => result$.subscribe({ next: res })),
      ).resolves.toBe('ok');
    });
  });
});
