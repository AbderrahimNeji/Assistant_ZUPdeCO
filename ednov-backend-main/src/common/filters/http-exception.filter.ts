import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    if (status >= 500) {
      console.error(`${request.method} ${request.url} ${status}`, exception instanceof Error ? exception.stack : undefined);
    }

    // If headers/response body have already started streaming (e.g. SSE endpoints),
    // we cannot write a JSON error anymore — doing so throws ERR_HTTP_HEADERS_SENT
    // and abruptly closes the stream, causing EventSource reconnect loops.
    if (response.headersSent) {
      try {
        response.end();
      } catch {
        /* no-op */
      }
      return;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'object' && message !== null ? message : { message }),
    });
  }
}
