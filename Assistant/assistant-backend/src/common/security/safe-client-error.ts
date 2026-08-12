import { HttpException, HttpStatus } from '@nestjs/common';

const GENERIC = 'Something went wrong. Please try again.';
const GENERIC_UNAVAILABLE =
  'The assistant is temporarily unavailable. Please try again in a moment.';
const GENERIC_QUOTA =
  'The assistant is busy right now. Please try again in a moment.';

const LEAKY =
  /gemini|generativelanguage|langchain|openai|anthropic|provider|stack|GEMINI_|API_KEY|ECONNREFUSED|prisma|axios|firebase-admin|nested exception|at Object\.|Error: /i;

function extractHttpMessage(error: HttpException): string {
  const response = error.getResponse();
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object' && 'message' in response) {
    const raw = (response as { message?: string | string[] }).message;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw.filter((item) => typeof item === 'string').join(' ');
  }
  return error.message;
}

function isUserSafeClientMessage(message: string): boolean {
  if (!message || LEAKY.test(message)) return false;
  return /not found|already|cannot|forbidden|unauthorized|invalid|empty|provide|select|expired|unsupported|unreadable|timed out|sign in|try again|please|malformed|too large|too deeply|required|sélection|confirmez|ouvre/i.test(
    message,
  );
}

/**
 * User-facing error text. Logs must keep the original exception server-side.
 */
export function toClientSafeErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const status = error.getStatus();
    if (status === HttpStatus.TOO_MANY_REQUESTS) return GENERIC_QUOTA;
    if (
      status === HttpStatus.BAD_GATEWAY ||
      status === HttpStatus.SERVICE_UNAVAILABLE ||
      status === HttpStatus.GATEWAY_TIMEOUT
    ) {
      return GENERIC_UNAVAILABLE;
    }
    if (status >= 500) return GENERIC;

    const message = extractHttpMessage(error);
    if (isUserSafeClientMessage(message)) return message;
    if (status === HttpStatus.UNAUTHORIZED) {
      return 'Your session expired. Please sign in again.';
    }
    if (status === HttpStatus.FORBIDDEN) {
      return 'You cannot perform that action.';
    }
    if (status === HttpStatus.NOT_FOUND) {
      return 'The requested resource was not found.';
    }
    if (status === HttpStatus.BAD_REQUEST) {
      return isUserSafeClientMessage(message)
        ? message
        : 'The request could not be processed.';
    }
    return GENERIC;
  }

  if (error instanceof Error && isUserSafeClientMessage(error.message)) {
    return error.message;
  }

  return GENERIC;
}
