import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AppLogger } from '../logger/app-logger';

const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS ?? 2000);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const url = request.originalUrl || request.url;
    const requestId = request.requestId;
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - started;
          const statusCode = response.statusCode;
          const fields = {
            requestId,
            method,
            url,
            statusCode,
            durationMs,
            userId: request.user?.id,
          };

          if (durationMs >= SLOW_REQUEST_MS) {
            AppLogger.warn('Slow request', fields);
          } else {
            AppLogger.info('HTTP request', fields);
          }
        },
        error: () => {
          const durationMs = Date.now() - started;
          AppLogger.warn('HTTP request failed', {
            requestId,
            method,
            url,
            durationMs,
            userId: request.user?.id,
          });
        },
      }),
    );
  }
}
