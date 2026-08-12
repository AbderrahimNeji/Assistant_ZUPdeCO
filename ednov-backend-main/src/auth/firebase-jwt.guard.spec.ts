import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseJwtGuard } from './firebase-jwt.guard';
import { AuthService } from './auth.service';

const mockAuthService = {
  getUserByFirebaseUid: jest.fn(),
};

const mockVerifyIdToken = jest.fn();

jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

describe('FirebaseJwtGuard', () => {
  let guard: FirebaseJwtGuard;
  let reflector: Reflector;

  const createMockContext = (authHeader: string | undefined, isPublic = false): ExecutionContext => {
    const request = { headers: { authorization: authHeader } };
    reflector.getAllAndOverride = jest.fn().mockReturnValue(isPublic);
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseJwtGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    guard = module.get<FirebaseJwtGuard>(FirebaseJwtGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access for public routes without token', async () => {
    const context = createMockContext(undefined, true);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when no token provided', async () => {
    const context = createMockContext(undefined, false);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when token is invalid', async () => {
    const context = createMockContext('Bearer invalid-token', false);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should set request.user from DB when token is valid', async () => {
    const context = createMockContext('Bearer valid-token', false);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    mockVerifyIdToken.mockResolvedValue({ uid: 'firebase-uid-1' });
    mockAuthService.getUserByFirebaseUid.mockResolvedValue({
      id: 'user-uuid-1',
      companyId: 'company-1',
      roleCodes: ['admin'],
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockAuthService.getUserByFirebaseUid).toHaveBeenCalledWith('firebase-uid-1');
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({
      uid: 'user-uuid-1',
      id: 'user-uuid-1',
      firebaseUid: 'firebase-uid-1',
      company_id: 'company-1',
      companyId: 'company-1',
      roles: ['admin'],
      roleCodes: ['admin'],
    });
  });

  it('should rethrow ForbiddenException from AuthService', async () => {
    const context = createMockContext('Bearer valid-token', false);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    mockVerifyIdToken.mockResolvedValue({ uid: 'firebase-uid-1' });
    mockAuthService.getUserByFirebaseUid.mockRejectedValue(
      new ForbiddenException("Vous n'êtes pas autorisé à accéder à cette application."),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException when user not found in DB', async () => {
    const context = createMockContext('Bearer valid-token', false);
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    mockVerifyIdToken.mockResolvedValue({ uid: 'firebase-uid-1' });
    mockAuthService.getUserByFirebaseUid.mockRejectedValue(new UnauthorizedException('Invalid token'));

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
