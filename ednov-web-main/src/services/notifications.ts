import apiClient from './api-client';

export type NotificationType =
  | 'SESSION_REPORT_REMINDER_24H'
  | 'SESSION_REPORT_REMINDER_96H'
  | 'VSC_DAILY_REPORT_AVAILABLE'
  | 'SESSION_REPORT_VALIDATED_TUTOR';

export interface AppNotification {
  id: string;
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
}

export const notificationsApi = {
  list: (page = 1, pageSize = 20, unreadOnly = false): Promise<PaginatedNotifications> =>
    apiClient.get('/notifications', { params: { page, pageSize, unreadOnly } }).then((r) => r.data),

  unreadCount: (): Promise<number> =>
    apiClient.get('/notifications/unread-count').then((r) => r.data?.count ?? 0),

  markRead: (id: string): Promise<AppNotification> =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: (): Promise<void> => apiClient.post('/notifications/read-all').then(() => undefined),
};
