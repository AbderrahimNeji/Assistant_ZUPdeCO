import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    const { method, url } = req;
    const start = Date.now();
    const urlForMatch = String(url);
    const isSse = urlForMatch.includes('/notifications/stream');

    // SSE: log the connection once on open and let the Observable flow through
    // untouched. Any `tap()` or wrapping operator here risks interfering with the
    // stream lifecycle and causing reconnect loops.
    if (isSse) {
      const pathOnly = urlForMatch.split('?')[0] ?? urlForMatch;
      console.log(`${method} ${pathOnly} (SSE open) [${correlationId}]`);
      return next.handle();
    }

    res.setHeader('x-correlation-id', correlationId);

    return next.handle().pipe(
      tap({
        next: () => {
          console.log(
            `${method} ${url} ${res.statusCode} +${Date.now() - start}ms [${correlationId}]`,
          );
        },
        error: (error: unknown) => {
          const status = error instanceof HttpException ? error.getStatus() : 500;
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.warn(
            `${method} ${url} ${status} ERR +${Date.now() - start}ms [${correlationId}] ${message}`,
          );
        },
      }),
    );
  }
}
