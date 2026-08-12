import type { ScheduleConfig, PostItColor } from '../../../types/post-it.types';
import { describeSchedule } from '../../../utils/schedule-description';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_MAP, ICON_COLOR_MAP, BORDER_COLOR_MAP } from '../postit-config';

interface ScheduleSummaryProps {
  config: ScheduleConfig | null;
  color?: PostItColor;
}

export function ScheduleSummary({ config, color = 'jaune' }: ScheduleSummaryProps) {
  if (!config) return null;

  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.jaune;
  const iconColor = ICON_COLOR_MAP[color] || ICON_COLOR_MAP.jaune;
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;

  const description = describeSchedule(config);

  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 rounded-lg border', borderColor)}>
      <CalendarClock className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', iconColor)} />
      <p className={cn('text-xs leading-relaxed', textColor)}>{description}</p>
    </div>
  );
}
