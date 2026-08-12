import { Injectable } from '@nestjs/common';

import { EdnovApiClient } from '../ednov-api.client';
import { encodeEdnovId } from '../ednov-path';

type EdnovNotification = {
  id: string;
  title?: string;
  body?: string;
  message?: string;
  content?: string;
  read?: boolean;
  createdAt?: string;
};

@Injectable()
export class NotificationAdapter {
  constructor(private readonly ednov: EdnovApiClient) {}

  async listForUser(userId: string): Promise<{
    userId: string;
    items: Array<{ id: string; title: string; body: string }>;
    hint: string;
  }> {
    const raw = await this.ednov.get<
      EdnovNotification[] | { data?: EdnovNotification[]; items?: EdnovNotification[] }
    >('/notifications');

    const list = Array.isArray(raw)
      ? raw
      : raw.data ?? raw.items ?? [];

    const items = list.slice(0, 20).map((row) => ({
      id: row.id,
      title: row.title || 'Notification',
      body: row.body || row.message || row.content || '',
    }));

    return {
      userId,
      items,
      hint: items.length
        ? `You have ${items.length} notification(s).`
        : 'You have no new notifications right now.',
    };
  }

  async markRead(notificationId: string) {
    return this.ednov.patch(
      `/notifications/${encodeEdnovId(notificationId)}/read`,
      {},
    );
  }

  async markAllRead() {
    return this.ednov.post('/notifications/read-all', {});
  }

  async unreadCount(): Promise<number> {
    const raw = await this.ednov.get<{ count?: number } | number>(
      '/notifications/unread-count',
    );
    if (typeof raw === 'number') return raw;
    return typeof raw.count === 'number' ? raw.count : 0;
  }
}
