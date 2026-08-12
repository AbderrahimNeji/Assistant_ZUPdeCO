import { Injectable } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { Notification } from './entities/notification.entity';

type InternalEvent =
  | { kind: 'created'; userId: string; notification: Notification }
  | { kind: 'read'; userId: string; notificationId: string }
  | { kind: 'read_all'; userId: string };

export interface OutboundEvent {
  type: 'notification.created' | 'notification.read' | 'notification.read_all';
  data: unknown;
}

/**
 * Lightweight in-process pub/sub for notification events.
 * Per-user filtering is applied via `streamFor`.
 *
 * When horizontal scaling is introduced (>1 backend instance), replace the internal
 * `Subject` with a Redis pub/sub (or equivalent) adapter. Consumers do not change.
 */
@Injectable()
export class NotificationsEventsService {
  private readonly bus$ = new Subject<InternalEvent>();

  publishCreated(notification: Notification): void {
    this.bus$.next({ kind: 'created', userId: notification.userId, notification });
  }

  publishRead(userId: string, notificationId: string): void {
    this.bus$.next({ kind: 'read', userId, notificationId });
  }

  publishReadAll(userId: string): void {
    this.bus$.next({ kind: 'read_all', userId });
  }

  streamFor(userId: string): Observable<OutboundEvent> {
    return this.bus$.pipe(
      filter((event) => event.userId === userId),
      map((event): OutboundEvent => {
        if (event.kind === 'created') {
          return { type: 'notification.created', data: event.notification };
        }
        if (event.kind === 'read') {
          return { type: 'notification.read', data: { id: event.notificationId } };
        }
        return { type: 'notification.read_all', data: {} };
      }),
    );
  }
}
