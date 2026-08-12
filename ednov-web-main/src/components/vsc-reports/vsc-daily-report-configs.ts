import { FileEdit, Send, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { VscDailyReportStatus } from '@/types/vsc-daily-report.types';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface VscDailyReportStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export const VSC_DAILY_REPORT_STATUS_CONFIG: Record<
  VscDailyReportStatus,
  VscDailyReportStatusConfig
> = {
  to_fill: {
    label: 'À saisir',
    icon: FileEdit,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
  },
  submitted: {
    label: 'Soumis',
    icon: Send,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
  },
  validated: {
    label: 'Validé',
    icon: CheckCircle2,
    badgeVariant: 'active',
  },
};
