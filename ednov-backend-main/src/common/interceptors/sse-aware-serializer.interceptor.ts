import {
  CallHandler,
  ClassSerializerInterceptor,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';

/**
 * Wraps `ClassSerializerInterceptor` so it is bypassed for SSE routes.
 *
 * Why: `@Sse()` endpoints emit `MessageEvent { type, data }` objects many times over the
 * life of the connection. Running each emission through `classToPlain` can mutate the
 * shape expected by Nest's SSE writer (`type`/`data`/`id`/`retry`), which then throws
 * a downstream error. Nest catches this error and tries to convert it to an HTTP
 * response — but the SSE headers have already been flushed, so Node throws
 * `ERR_HTTP_HEADERS_SENT` ("Cannot set headers after they are sent to the client").
 * That error gets surfaced as an `event: error` frame and the browser reconnects in
 * a tight loop.
 *
 * For every SSE request (identified by its URL path), we short-circuit the serializer
 * and just forward the Observable untouched. Everything else uses the standard
 * `ClassSerializerInterceptor` behaviour.
 */
@Injectable()
export class SseAwareClassSerializerInterceptor extends ClassSerializerInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const url = String(req?.url ?? '');
    if (url.includes('/notifications/stream')) {
      return next.handle();
    }
    return super.intercept(context, next);
  }
}
