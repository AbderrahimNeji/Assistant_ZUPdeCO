import { AlertCircle, CalendarClock, CheckCircle2, Clock, FileText } from 'lucide-react';
import type { ComponentType } from 'react';
import type { AppNotification, NotificationType } from '@/services/notifications';

export type IconMeta = {
  Icon: ComponentType<{ className?: string }>;
  /** Tailwind-ish color class for the icon itself. */
  colorClass: string;
  /** Tailwind-ish util applied to the circular background. */
  bgClass: string;
};

export function getIconMeta(type: NotificationType): IconMeta {
  switch (type) {
    case 'SESSION_REPORT_REMINDER_24H':
      return {
        Icon: Clock,
        colorClass: 'notif-icon-amber',
        bgClass: 'notif-icon-bg-amber',
      };
    case 'SESSION_REPORT_REMINDER_96H':
      return {
        Icon: AlertCircle,
        colorClass: 'notif-icon-red',
        bgClass: 'notif-icon-bg-red',
      };
    case 'VSC_DAILY_REPORT_AVAILABLE':
      return {
        Icon: CalendarClock,
        colorClass: 'notif-icon-blue',
        bgClass: 'notif-icon-bg-blue',
      };
    case 'SESSION_REPORT_VALIDATED_TUTOR':
      return {
        Icon: CheckCircle2,
        colorClass: 'notif-icon-green',
        bgClass: 'notif-icon-bg-green',
      };
    default:
      return {
        Icon: FileText,
        colorClass: 'notif-icon-slate',
        bgClass: 'notif-icon-bg-slate',
      };
  }
}

export function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString('fr-FR');
}

export function resolveDeepLink(n: AppNotification): string | null {
  if (n.type === 'VSC_DAILY_REPORT_AVAILABLE') {
    const payload = n.payload ?? {};
    const dailyId = typeof payload.vscDailyReportId === 'string' ? payload.vscDailyReportId : null;
    const reportDate = typeof payload.reportDate === 'string' ? payload.reportDate : null;
    const establishmentId =
      typeof payload.establishmentId === 'string' ? payload.establishmentId : null;
    const qs = new URLSearchParams();
    if (dailyId) qs.set('view', dailyId);
    if (reportDate) qs.set('reportDate', reportDate.slice(0, 10));
    if (establishmentId) qs.set('establishmentId', establishmentId);
    const q = qs.toString();
    return q ? `/dashboard/vsc-reports?${q}` : '/dashboard/vsc-reports';
  }
  const payload = n.payload ?? {};
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : null;
  const reportId = typeof payload.reportId === 'string' ? payload.reportId : null;
  if (sessionId && reportId) {
    const qs = new URLSearchParams();
    qs.set('view', reportId);
    qs.set('sessionId', sessionId);
    return `/dashboard/reports?${qs.toString()}`;
  }
  if (sessionId) {
    return `/dashboard/sessions?view=${encodeURIComponent(sessionId)}`;
  }
  return null;
}

export type Bucket = 'today' | 'week' | 'older';

export const BUCKET_LABELS: Record<Bucket, string> = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  older: 'Plus ancien',
};

export function bucketOf(iso: string): Bucket {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return 'today';
  const weekAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
  if (date.getTime() >= weekAgo) return 'week';
  return 'older';
}

export function groupByBucket(items: AppNotification[]): Array<[Bucket, AppNotification[]]> {
  const order: Bucket[] = ['today', 'week', 'older'];
  const map: Record<Bucket, AppNotification[]> = { today: [], week: [], older: [] };
  for (const it of items) {
    map[bucketOf(it.createdAt)].push(it);
  }
  return order
    .map((b) => [b, map[b]] as [Bucket, AppNotification[]])
    .filter(([, arr]) => arr.length > 0);
}
