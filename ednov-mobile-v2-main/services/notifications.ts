import api from '@/services/api';

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

export async function fetchNotifications(
  page = 1,
  pageSize = 20,
  unreadOnly = false,
): Promise<PaginatedNotifications> {
  const res = await api.get<PaginatedNotifications>('/notifications', {
    params: { page, pageSize, unreadOnly },
  });
  return res.data;
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await api.get<{ count: number }>('/notifications/unread-count');
  return res.data?.count ?? 0;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const res = await api.patch<AppNotification>(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}
