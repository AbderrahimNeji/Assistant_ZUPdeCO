import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { RequestContextStore } from './request-context';

/**
 * Opens an AsyncLocalStorage scope for every HTTP request so auth guards
 * and controllers can share accessToken + applicationContext.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    RequestContextStore.run({}, () => next());
  }
}
