import { MapPin, CalendarClock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LabelBadge } from '@/components/common/LabelBadge';
import { cn } from '@/lib/utils';
import { POST_IT_STATUS_CONFIG } from '@/components/post-its/post-it-configs';
import type { TrackingOccurrence } from '@/types/post-it.types';

interface TrackingOccurrenceListProps {
  occurrences: TrackingOccurrence[];
  isLoading: boolean;
  selectedPeriodKey: string | null;
  onSelect: (occurrence: TrackingOccurrence) => void;
}

export function TrackingOccurrenceList({
  occurrences,
  isLoading,
  selectedPeriodKey,
  onSelect,
}: TrackingOccurrenceListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!occurrences.length) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Aucune occurrence
      </div>
    );
  }

  const getCompletionPercentage = (occ: TrackingOccurrence) => {
    if (occ.stats.total === 0) return 0;
    return Math.round((occ.stats.done / occ.stats.total) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return POST_IT_STATUS_CONFIG.done.dotColor;
    if (percentage >= 50) return POST_IT_STATUS_CONFIG.en_cours.dotColor;
    return POST_IT_STATUS_CONFIG.depasse.dotColor;
  };

  const enCours = POST_IT_STATUS_CONFIG.en_cours;
  const EnCoursIcon = enCours.icon;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 space-y-1">
        {[...occurrences]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((occ) => {
            const percentage = getCompletionPercentage(occ);
            const isSelected = occ.periodKey === selectedPeriodKey;
            const isFuture = !occ.provisioned;
            const isCurrent = occ.provisioned && new Date(occ.date) >= new Date();

            return (
              <button
                key={occ.periodKey}
                onClick={() => onSelect(occ)}
                disabled={!occ.provisioned}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg transition-all focus:outline-none',
                  isSelected
                    ? 'shadow-sm'
                    : 'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_5%,transparent)]',
                  isFuture && 'opacity-40 cursor-not-allowed',
                )}
                style={
                  isSelected
                    ? {
                        background: 'color-mix(in srgb, var(--color-1-nuance-1) 12%, transparent)',
                        outline:
                          '1.5px solid color-mix(in srgb, var(--color-1-nuance-1) 35%, transparent)',
                      }
                    : undefined
                }
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSelected && (
                      <MapPin
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: 'var(--color-1-nuance-1)' }}
                      />
                    )}
                    <span
                      className={cn('font-medium text-sm truncate', isSelected && 'font-semibold')}
                      style={isSelected ? { color: 'var(--color-1-nuance-1)' } : undefined}
                    >
                      {occ.label}
                    </span>
                  </div>

                  {isFuture && (
                    <LabelBadge
                      label="À venir"
                      variant="ghost"
                      color="var(--color-1-nuance-1)"
                      icon={CalendarClock}
                      size="sm"
                      className="min-w-0 shrink-0"
                    />
                  )}
                  {isCurrent && (
                    <LabelBadge
                      label={enCours.label}
                      variant={enCours.badgeVariant}
                      color={enCours.badgeColor}
                      icon={EnCoursIcon}
                      size="sm"
                      className="min-w-0 shrink-0"
                    />
                  )}
                </div>

                {/* Progress bar */}
                {occ.provisioned && (
                  <>
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden mb-1.5"
                      style={{
                        background: 'color-mix(in srgb, var(--color-1-nuance-1) 10%, transparent)',
                      }}
                    >
                      <div
                        className="h-full transition-all rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getProgressColor(percentage),
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{percentage}%</span>
                      <span>
                        {occ.stats.done}/{occ.stats.total}
                      </span>
                    </div>
                  </>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}
