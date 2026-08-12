import {
  Controller,
  Get,
  MessageEvent,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Observable, catchError, EMPTY } from 'rxjs';
import { NotificationsEventsService } from './notifications-events.service';
import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user?: { id?: string };
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly events: NotificationsEventsService,
  ) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('unreadOnly', new ParseBoolPipe({ optional: true })) unreadOnly?: boolean,
  ) {
    const userId = req.user?.id as string;
    return this.service.list(userId, { page, pageSize, unreadOnly });
  }

  @Get('unread-count')
  async unreadCount(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id as string;
    return { count: await this.service.unreadCount(userId) };
  }

  @Patch(':id/read')
  markRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user?.id as string;
    return this.service.markRead(userId, id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id as string;
    await this.service.markAllRead(userId);
    return { ok: true };
  }

  /**
   * Server-Sent Events stream of real-time notification events for the authenticated user.
   * Events: `notification.created`, `notification.read`, `notification.read_all`.
   * A `heartbeat` event is emitted every 25 s to keep the connection alive through proxies.
   *
   * Nest's `@Sse()` decorator already sets the required SSE headers
   * (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`)
   * and flushes them. We must NOT add `@Header(...)` decorators, call `res.setHeader()`,
   * `res.flushHeaders()`, or throw after the subscription has started — doing so would
   * trigger "Cannot set headers after they are sent" and force the browser to reconnect
   * in a loop.
   *
   * `catchError` swallows any unexpected downstream error so Nest does not emit it as an
   * `event: error` frame (which also causes EventSource to reconnect).
   */
  @SkipThrottle()
  @Sse('stream')
  stream(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    const userId = req.user?.id as string;
    return new Observable<MessageEvent>((subscriber) => {
      subscriber.next({ type: 'hello', data: { userId } });
      const sub = this.events.streamFor(userId).subscribe((event) => {
        subscriber.next({ type: event.type, data: event.data } as MessageEvent);
      });
      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'heartbeat', data: { t: Date.now() } } as MessageEvent);
      }, 25_000);
      return () => {
        clearInterval(heartbeat);
        sub.unsubscribe();
      };
    }).pipe(
      catchError(() => EMPTY),
    );
  }
}
