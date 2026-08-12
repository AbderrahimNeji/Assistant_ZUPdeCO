import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { FirebaseAuthBridgeService } from '../../integration/firebase-auth-bridge.service';
import {
  getAuthMode,
  RequestContextStore,
} from '../../integration/request-context';

/**
 * Dual-mode auth guard.
 * - AUTH_MODE=local → existing Passport JWT strategy
 * - AUTH_MODE=firebase → Firebase ID token via FirebaseAuthBridgeService
 *
 * Controllers keep using @UseGuards(JwtAuthGuard) — no controller changes required.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (getAuthMode() === 'firebase') {
      return this.activateFirebase(context);
    }
    return (await super.canActivate(context)) as boolean;
  }

  private async activateFirebase(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { id: string; email: string; role: string };
    }>();

    const authHeader = request.headers.authorization;
    if (
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ') ||
      !authHeader.slice(7).trim()
    ) {
      throw new UnauthorizedException('Missing access token');
    }

    const token = authHeader.slice(7).trim();
    const bridge = this.moduleRef.get(FirebaseAuthBridgeService, {
      strict: false,
    });
    if (!bridge) {
      throw new UnauthorizedException(
        'Firebase auth bridge is not available',
      );
    }

    const bridged = await bridge.authenticate(token);

    request.user = {
      id: bridged.id,
      email: bridged.email,
      role: bridged.role,
    };

    RequestContextStore.patch({
      accessToken: token,
      authMode: 'firebase',
      ednovUserId: bridged.ednovUserId,
      ednovCompanyId: bridged.ednovCompanyId,
      firebaseUid: bridged.firebaseUid,
    });

    return true;
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (getAuthMode() === 'firebase') {
      if (err || !user) {
        throw err || new UnauthorizedException('Unauthorized');
      }
      return user;
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    const authHeader = request.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      RequestContextStore.patch({
        accessToken: authHeader.slice(7).trim(),
        authMode: 'local',
      });
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized');
    }
    return user;
  }
}
