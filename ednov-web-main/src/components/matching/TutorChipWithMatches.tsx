import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { RemovableParticipantChip } from '@/components/sessions/RemovableParticipantChip';
import { cn } from '@/lib/utils';
import type { UserWithProfile } from '@/types/user.types';
import type { TutorSlotAvailabilityStatus } from '@/components/sessions/session-tutor-availability';
import { AlertCircle, Clock } from 'lucide-react';

interface TutorChipWithMatchesProps {
  tutor: UserWithProfile;
  matchedStudents: Array<UserWithProfile & { assignmentSource?: string }>;
  onRemove: () => void;
  sessionId: string;
  onStudentRemove?: (studentId: string) => void;
  /** Cache la pastille de comptage à l'intérieur du chip tuteur (le total reste affiché en dehors). */
  hideMatchCountBadge?: boolean;
  slotAvailability?: TutorSlotAvailabilityStatus;
  slotConflictHint?: string;
}

/**
 * Retourne le label d'affichage pour la source d'assignation
 */
const getAssignmentSourceLabel = (source?: string): string => {
  if (source === 'auto_binome_coeur') return 'Binôme cœur';
  if (source === 'auto_balanced') return 'Équilibré';
  return 'Historique';
};

/**
 * TutorChipWithMatches - Chip tuteur avec élèves matchés nested
 *
 * Fonctionnalités:
 * - Affiche le nom du tuteur
 * - Affiche les élèves matchés à l'intérieur (nested chips)
 * - Droppable: accepte le drag d'élèves pour créer un matching
 * - Effet visuel au hover pendant drag (scale + border)
 * - Bouton remove pour retirer le tuteur
 *
 * Note: Le drop est géré au niveau du DndContext dans ConfigureMatchingView
 */
export const TutorChipWithMatches: React.FC<TutorChipWithMatchesProps> = ({
  tutor,
  matchedStudents,
  onRemove,
  sessionId,
  onStudentRemove,
  hideMatchCountBadge = false,
  slotAvailability,
  slotConflictHint,
}) => {
  const dropId = `tutor-chip-${tutor.id}-${sessionId}`;

  const { setNodeRef, isOver, active } = useDroppable({
    id: dropId,
    data: { tutorId: tutor.id, sessionId, type: 'tutor-chip' },
  });

  // Supporte les deux formats de data :
  //   - DraggableUserCard → { roleGroup: 'students', user }
  //   - RemovableParticipantChip → { type: 'student', user }
  const activeDragData = active?.data?.current;
  const activeDragType = activeDragData?.type as string | undefined;
  const activeDragRoleGroup = activeDragData?.roleGroup as string | undefined;
  const isStudentDragging = activeDragType === 'student' || activeDragRoleGroup === 'students';
  const shouldShowDropEffect = isOver && isStudentDragging;

  const hasMatches = matchedStudents.length > 0;
  const hasSlotConflict = slotAvailability === 'conflict';
  const isSlotChecking = slotAvailability === 'checking';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'tutor-chip-with-matches',
        shouldShowDropEffect && 'tutor-chip-drop-over',
        hasMatches && 'tutor-chip-has-matches',
        hasSlotConflict &&
          'border-[rgb(var(--color-warning))] bg-[rgb(var(--color-warning)_/_0.06)]',
      )}
      title={hasSlotConflict ? slotConflictHint : undefined}
    >
      {/* Tuteur Header */}
      <div className="tutor-chip-header">
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center border"
            style={{
              background: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
              borderColor: 'var(--color-2-nuance-1)',
            }}
          >
            <GraduationCap className="w-3.5 h-3.5" style={{ color: 'var(--color-2-nuance-1)' }} />
          </div>
          <span className="font-medium text-sm">
            {`${tutor.firstName} ${tutor.lastName}`.trim() || 'Tuteur'}
          </span>
          {isSlotChecking && (
            <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden />
          )}
          {hasSlotConflict && (
            <AlertCircle
              className="w-3.5 h-3.5 flex-shrink-0 text-[rgb(var(--color-warning))]"
              aria-label={slotConflictHint ?? 'Indisponible à cet horaire'}
            />
          )}
          {matchedStudents.length > 0 && !hideMatchCountBadge && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-full border"
              style={{
                background: 'color-mix(in srgb, var(--color-3-nuance-1) 15%, transparent)',
                color: 'var(--color-3-nuance-1)',
                borderColor: 'var(--color-3-nuance-1)',
              }}
            >
              {matchedStudents.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          icon={X}
          iconOnly
          onClick={onRemove}
          className="tutor-chip-remove-btn"
          aria-label="Retirer tuteur"
        />
      </div>

      {/* Élèves matchés (nested) */}
      {hasMatches && (
        <div className="tutor-chip-students">
          {matchedStudents.map((student) => (
            <div key={student.id} className="tutor-chip-student">
              <div className="flex items-center gap-1.5 w-full">
                <RemovableParticipantChip
                  user={student}
                  role="student"
                  onRemove={() => onStudentRemove?.(student.id)}
                  size="sm"
                  draggable={true}
                />
                {student.assignmentSource && student.assignmentSource !== 'manual' && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap"
                    style={{
                      background:
                        student.assignmentSource === 'auto_binome_coeur'
                          ? 'color-mix(in srgb, var(--color-1-nuance-1) 12%, transparent)'
                          : 'color-mix(in srgb, var(--color-3-nuance-1) 12%, transparent)',
                      color:
                        student.assignmentSource === 'auto_binome_coeur'
                          ? 'var(--color-1-nuance-1)'
                          : 'var(--color-3-nuance-1)',
                      borderColor:
                        student.assignmentSource === 'auto_binome_coeur'
                          ? 'var(--color-1-nuance-1)'
                          : 'var(--color-3-nuance-1)',
                    }}
                    title={getAssignmentSourceLabel(student.assignmentSource)}
                  >
                    {student.assignmentSource === 'auto_binome_coeur' ? '♥' : '⚖'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Placeholder si pas d'élèves */}
      {!hasMatches && shouldShowDropEffect && (
        <div className="tutor-chip-drop-placeholder">
          <p className="text-xs text-muted-foreground">Déposez un élève ici</p>
        </div>
      )}
    </div>
  );
};
