import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Users, AlertCircle } from 'lucide-react';
import { ParticipantChip } from './ParticipantChip';
import { cn } from '@/lib/utils';
import type { UserWithProfile } from '@/types/user.types';

interface DroppableZoneProps {
  id: string;
  label: string;
  participants: UserWithProfile[];
  maxCapacity?: number | null;
  onRemove: (userId: string) => void;
  acceptType: 'tutor' | 'student';
  className?: string;
}

export const DroppableZone: React.FC<DroppableZoneProps> = ({
  id,
  label,
  participants,
  maxCapacity,
  onRemove,
  acceptType,
  className,
}) => {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: { acceptType },
  });

  const isEmpty = participants.length === 0;
  const capacityReached =
    maxCapacity !== null && maxCapacity !== undefined && participants.length >= maxCapacity;
  const capacityPercentage = maxCapacity ? (participants.length / maxCapacity) * 100 : 0;

  // Vérifier si le drag actuel est compatible
  const activeDragType = active?.data?.current?.type as string | undefined;
  const isValidDrop = activeDragType === acceptType;
  const showInvalidFeedback = isOver && !isValidDrop;
  const showCapacityWarning = isOver && isValidDrop && capacityReached;

  const shouldShowDropOver = isOver && isValidDrop && !capacityReached;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'droppable-zone rounded-xl transition-all duration-300',
        isEmpty && 'droppable-zone-empty',
        !isEmpty && 'droppable-zone-filled',
        shouldShowDropOver && 'drop-over',
        showInvalidFeedback && 'drop-invalid',
        showCapacityWarning && 'drop-capacity-reached',
        className,
      )}
    >
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <Users className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Glissez-déposez des {label.toLowerCase()} ici
          </p>
        </div>
      ) : (
        <>
          {/* Header avec capacité */}
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-[var(--color-1-nuance-1)] text-sm">{label}</h5>
            <span
              className={cn(
                'capacity-indicator text-xs font-semibold px-2 py-0.5 rounded-full',
                'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]',
                'text-[var(--color-2-nuance-1)]',
                capacityReached &&
                  'capacity-indicator-at-limit bg-[rgb(var(--color-error)_/_0.1)] text-[rgb(var(--color-error))]',
              )}
            >
              {participants.length}/{maxCapacity || '∞'}
            </span>
          </div>

          {/* Progress bar */}
          {maxCapacity && (
            <div className="progress-bar h-1 rounded-full bg-[color-mix(in_srgb,var(--color-1-nuance-3)_30%,transparent)] overflow-hidden mb-3">
              <div
                className={cn(
                  'progress-fill h-full transition-all duration-300',
                  capacityPercentage < 80 &&
                    'bg-[linear-gradient(90deg,var(--color-2-nuance-1),var(--color-2-nuance-2))]',
                  capacityPercentage >= 80 &&
                    capacityPercentage < 100 &&
                    'bg-[linear-gradient(90deg,rgb(var(--color-warning)),rgb(var(--color-warning)))]',
                  capacityPercentage >= 100 &&
                    'bg-[linear-gradient(90deg,rgb(var(--color-error)),rgb(var(--color-error)))]',
                )}
                style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
              />
            </div>
          )}

          {/* Liste des participants */}
          <div className="flex flex-wrap gap-2">
            {participants.map((user) => (
              <div key={user.id} className="relative group">
                <ParticipantChip user={user} role={acceptType === 'tutor' ? 'tutor' : 'student'} />
                <button
                  onClick={() => onRemove(user.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  aria-label="Retirer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Warning si capacité atteinte */}
          {capacityReached && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[rgb(var(--color-error))] bg-[rgb(var(--color-error)_/_0.1)] px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Capacité maximale atteinte</span>
            </div>
          )}
        </>
      )}

      {/* Feedback visuel pour drop invalide */}
      {showInvalidFeedback && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--color-error)_/_0.1)] border-2 border-[rgb(var(--color-error))] rounded-xl pointer-events-none animate-shake">
          <span className="text-sm font-semibold text-[rgb(var(--color-error))] bg-white dark:bg-[rgb(var(--card-rgb))] px-3 py-1.5 rounded-lg shadow-lg">
            Type de participant incompatible
          </span>
        </div>
      )}

      {/* Feedback pour capacité atteinte */}
      {showCapacityWarning && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--color-error)_/_0.1)] border-2 border-[rgb(var(--color-error))] rounded-xl pointer-events-none animate-shake">
          <span className="text-sm font-semibold text-[rgb(var(--color-error))] bg-white dark:bg-[rgb(var(--card-rgb))] px-3 py-1.5 rounded-lg shadow-lg">
            Capacité maximale atteinte ({maxCapacity})
          </span>
        </div>
      )}
    </div>
  );
};
