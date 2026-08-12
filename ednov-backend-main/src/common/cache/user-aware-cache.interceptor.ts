import { Injectable, ExecutionContext } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

/**
 * Cache interceptor that includes the authenticated user's ID in the cache key.
 * This prevents user A's cached response from being served to user B,
 * which is critical for endpoints protected by visibility scope.
 *
 * Cache key format: <HTTP_METHOD>:<URL>:<userId>
 */
@Injectable()
export class UserAwareCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const baseKey = super.trackBy(context);
    if (!baseKey) return undefined;

    const req = context.switchToHttp().getRequest<{ user?: { uid?: string } }>();
    const userId = req.user?.uid ?? 'anonymous';

    return `${baseKey}:${userId}`;
  }
}
