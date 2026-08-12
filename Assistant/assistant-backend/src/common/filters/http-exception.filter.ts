import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { Request, Response } from 'express';

import { ErrorLogger } from '../logger/error-logger';
import { toClientSafeErrorMessage } from '../security/safe-client-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: { id?: string } }>();

    const isProduction = process.env.NODE_ENV === 'production';
    const timestamp = new Date().toISOString();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : undefined;

    const exceptionName =
      exception instanceof Error
        ? exception.name
        : 'UnknownError';

    const exceptionMessage =
      exception instanceof HttpException
        ? this.extractMessage(exceptionResponse ?? 'Unexpected error')
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    ErrorLogger.log(exception, 'HttpExceptionFilter.catch', {
      userId: request.user?.id,
      requestId: (request as Request & { requestId?: string }).requestId,
      method: request.method,
      url: request.originalUrl || request.url,
      statusCode: status,
      exceptionName,
      exceptionMessage,
      exceptionResponse:
        exceptionResponse !== undefined
          ? JSON.stringify(exceptionResponse)
          : undefined,
    });

    if (!isProduction) {
      console.error('==================== HTTP ERROR ====================');
      console.error(`Timestamp      : ${timestamp}`);
      console.error(`HTTP Method    : ${request.method}`);
      console.error(`URL            : ${request.originalUrl || request.url}`);
      console.error(`Status Code    : ${status}`);
      console.error(`Exception Name : ${exceptionName}`);
      console.error(`Exception Msg  : ${exceptionMessage}`);
      if (exceptionResponse !== undefined) {
        console.error('Exception Resp :');
        console.error(exceptionResponse);
      }
      if (exception instanceof Error && exception.stack) {
        console.error('Stack Trace    :');
        console.error(exception.stack);
      }
      console.error('====================================================');
    }

    const clientMessage =
      exception instanceof HttpException
        ? toClientSafeErrorMessage(exception)
        : 'Something went wrong. Please try again.';

    const body: Record<string, unknown> = {
      success: false,
      statusCode: status,
      timestamp,
      path: request.originalUrl || request.url,
      method: request.method,
      requestId: (request as Request & { requestId?: string }).requestId,
      message: isProduction
        ? clientMessage
        : exceptionMessage,
    };

    if (!isProduction) {
      body.error = exceptionName;
      body.details = exceptionResponse ?? exceptionMessage;
      if (exception instanceof Error && exception.stack) {
        body.stack = exception.stack;
      }
    }

    response.status(status).json(body);
  }

  private extractMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message: string | string[] })
        .message;
      return Array.isArray(message) ? message.join(', ') : message;
    }

    return 'Unexpected error';
  }
}
