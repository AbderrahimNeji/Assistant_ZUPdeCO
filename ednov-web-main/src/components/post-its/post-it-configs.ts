import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PostItStatus } from '@/types/post-it.types';
import type { BadgeVariant } from '@/components/common/LabelBadge';

export interface PostItStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
  dotColor: string;
}

export const POST_IT_STATUS_CONFIG: Record<PostItStatus, PostItStatusConfig> = {
  done: {
    label: 'Terminé',
    icon: CheckCircle,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--status-success))',
    dotColor: 'rgb(var(--status-success))',
  },
  depasse: {
    label: 'En retard',
    icon: AlertCircle,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--color-error))',
    dotColor: 'rgb(var(--color-error))',
  },
  en_cours: {
    label: 'En cours',
    icon: Clock,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
    dotColor: 'var(--color-1-nuance-1)',
  },
};
