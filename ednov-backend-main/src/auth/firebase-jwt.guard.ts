import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthService } from './auth.service';

@Injectable()
export class FirebaseJwtGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseJwtGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      console.log('[FirebaseJwtGuard] Route is public, skipping authentication');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const url = String(request?.url ?? '');
    const isSseStream = url.includes('/notifications/stream');

    if (!isSseStream) {
      this.logger.log(`${request.method} ${url}`);
    }

    const token = this.extractToken(request);
    if (!token) {
      this.logger.error('No token provided in Authorization header or ?token= for SSE');
      if (!isSseStream) {
        this.logger.error(`Headers: ${JSON.stringify(request.headers, null, 2)}`);
      }
      throw new UnauthorizedException('No token provided');
    }

    try {
      if (!isSseStream) {
        this.logger.debug(`Verifying token (first 20 chars): ${token.substring(0, 20)}...`);
      }
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (!isSseStream) {
        this.logger.debug(`Token verified, Firebase UID: ${decodedToken.uid}`);
      }

      const payload = await this.authService.getUserByFirebaseUid(decodedToken.uid);
      if (!isSseStream) {
        this.logger.debug(`User: ${payload.id}, company: ${payload.companyId}`);
      }

      request.user = {
        uid: payload.id,
        id: payload.id,
        firebaseUid: decodedToken.uid,
        company_id: payload.companyId,
        companyId: payload.companyId,
        roles: payload.roleCodes,
        roleCodes: payload.roleCodes,
      };
      return true;
    } catch (error) {
      // Preserve Nest HTTP errors from AuthService (e.g. ForbiddenException).
      if (error instanceof HttpException) {
        throw error;
      }
      console.error(`[FirebaseJwtGuard] JWT verification failed: ${(error as Error).message}`);
      console.error(`[FirebaseJwtGuard] Error stack: ${(error as Error).stack}`);
      if (error instanceof Error && 'code' in error) {
        this.logger.warn(`Firebase code: ${String((error as { code?: unknown }).code)}`);
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: {
    headers: { authorization?: string };
    query?: Record<string, unknown>;
  }): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) return token;
    }
    // Fallback for browser EventSource (SSE) which cannot set custom headers.
    const queryToken = request.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }
    return null;
  }
}
