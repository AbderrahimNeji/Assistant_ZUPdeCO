import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Users, AlertCircle, GraduationCap, User } from 'lucide-react';
import { RemovableParticipantChip } from '@/components/sessions/RemovableParticipantChip';
import { TutorChipWithMatches } from './TutorChipWithMatches';
import { cn } from '@/lib/utils';
import type { UserWithProfile } from '@/types/user.types';
import {
  formatConflictHint,
  type TutorAvailabilityById,
} from '@/components/sessions/session-tutor-availability';

interface UnifiedDropZoneProps {
  tutors: UserWithProfile[];
  students: UserWithProfile[];
  maxTutors?: number | null;
  maxStudents?: number | null;
  onRemoveTutor: (userId: string) => void;
  onRemoveStudent: (userId: string) => void;
  className?: string;
  // Props optionnels pour le mode matching (avec élèves nested dans tuteurs)
  sessionId?: string;
  specificMatches?: Array<{ studentId: string; tutorId: string }>;
  getTutorMatchedStudents?: (
    tutorId: string,
  ) => Array<UserWithProfile & { assignmentSource?: string }>;
  onUnmatchStudent?: (studentId: string, tutorId: string) => void;
  // Mode d'affichage
  mode?: 'unified' | 'matching';
  // Warning si capacité dépassée
  studentsOverCapacity?: number;
  tutorsOverCapacity?: number;
  /**
   * Cache toutes les pastilles internes de comptage des matchings (mode matching) :
   * la pastille "N matchings" en en-tête de la section Tuteurs ET la pastille de compte
   * sur chaque chip tuteur. Utile quand le parent affiche déjà ce compteur.
   */
  hideTutorMatchCount?: boolean;
  /** Disponibilité par tuteur sur le créneau courant (affichage inline sur les chips). */
  tutorAvailabilityById?: TutorAvailabilityById;
}

export const UnifiedDropZone: React.FC<UnifiedDropZoneProps> = ({
  tutors,
  students,
  maxTutors,
  maxStudents,
  onRemoveTutor,
  onRemoveStudent,
  className,
  sessionId,
  specificMatches = [],
  getTutorMatchedStudents,
  onUnmatchStudent,
  mode = 'unified',
  studentsOverCapacity = 0,
  tutorsOverCapacity = 0,
  hideTutorMatchCount = false,
  tutorAvailabilityById,
}) => {
  const isEmpty = tutors.length === 0 && students.length === 0;

  // En mode matching, filtrer les élèves déjà matchés de la section élèves
  const unmatchedStudents =
    mode === 'matching'
      ? students.filter((s) => !specificMatches.some((m) => m.studentId === s.id))
      : students;

  // UNE SEULE dropzone qui accepte tout
  const { setNodeRef, isOver, active } = useDroppable({
    id:
      mode === 'matching' && sessionId
        ? `matching-dropzone-unified-${sessionId}`
        : 'unified-participants-drop',
    data:
      mode === 'matching' ? { type: 'matching-dropzone-unified', sessionId } : { acceptsAll: true },
  });

  // Supporte les deux formats de data :
  //   - DraggableUserCard → { roleGroup: 'students'|'tutors'|'volunteers', user }
  //   - RemovableParticipantChip → { type: 'student'|'tutor'|'volunteer', user }
  const activeDragData = active?.data?.current;
  const activeDragRawType = activeDragData?.type as string | undefined;
  const activeDragRoleGroup = activeDragData?.roleGroup as string | undefined;
  const activeDragUser = activeDragData?.user as UserWithProfile | undefined;

  // Type normalisé pour les vérifications de capacité
  const isStudentDrag = activeDragRawType === 'student' || activeDragRoleGroup === 'students';
  const isTutorDrag =
    activeDragRawType === 'tutor' ||
    activeDragRawType === 'volunteer' ||
    activeDragRoleGroup === 'tutors' ||
    activeDragRoleGroup === 'volunteers';
  let activeDragType: 'tutor' | 'student' | undefined;
  if (isStudentDrag) {
    activeDragType = 'student';
  } else if (isTutorDrag) {
    activeDragType = 'tutor';
  }

  // Vérifier si l'utilisateur draggé est déjà dans la session
  const isActiveDragUserAlreadyInSession = React.useMemo(() => {
    if (!activeDragUser) return false;
    if (activeDragType === 'tutor') {
      return tutors.some((t) => t.id === activeDragUser.id);
    } else if (activeDragType === 'student') {
      return students.some((s) => s.id === activeDragUser.id);
    }
    return false;
  }, [activeDragUser, activeDragType, tutors, students]);

  const tutorsCapacityReached =
    maxTutors !== null && maxTutors !== undefined && tutors.length >= maxTutors;
  // IMPORTANT: Vérifier capacité avec TOUS les élèves (pas seulement unmatchedStudents)
  const studentsCapacityReached =
    maxStudents !== null && maxStudents !== undefined && students.length >= maxStudents;

  // Ne pas afficher le warning si l'utilisateur est déjà dans la session
  const showCapacityWarning =
    isOver &&
    !isActiveDragUserAlreadyInSession &&
    ((activeDragType === 'tutor' && tutorsCapacityReached) ||
      (activeDragType === 'student' && studentsCapacityReached));

  const shouldShowDropOver = isOver && !showCapacityWarning;

  // Calculer le total de matchings pour affichage
  const totalMatches = mode === 'matching' ? specificMatches.length : 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'droppable-zone rounded-xl transition-all duration-300 min-h-[200px] relative',
        isEmpty && 'droppable-zone-empty',
        !isEmpty && 'droppable-zone-filled',
        shouldShowDropOver && 'drop-over',
        showCapacityWarning && 'drop-capacity-reached',
        className,
      )}
    >
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Users className="w-12 h-12 text-muted-foreground/40" />
          <div className="text-center">
            <p className="text-base font-medium text-[var(--color-1-nuance-1)] mb-1">
              Aucun participant
            </p>
            <p className="text-sm text-muted-foreground">
              Glissez-déposez des tuteurs et élèves ici
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 divide-x divide-[var(--color-1-nuance-3)]">
          {/* Section Tuteurs - Gauche */}
          <div className="pr-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-1-nuance-3)]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
                <h5 className="font-semibold text-sm text-[var(--color-2-nuance-1)] uppercase tracking-wide">
                  Tuteurs
                </h5>
                {mode === 'matching' && totalMatches > 0 && !hideTutorMatchCount && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: 'color-mix(in srgb, var(--color-3-nuance-1) 15%, transparent)',
                      color: 'var(--color-3-nuance-1)',
                      borderColor: 'var(--color-3-nuance-1)',
                    }}
                  >
                    {totalMatches} {totalMatches > 1 ? 'matchings' : 'matching'}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'capacity-indicator text-xs font-bold px-2.5 py-1 rounded-full',
                  'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]',
                  'text-[var(--color-2-nuance-1)] border border-[var(--color-2-nuance-1)]',
                  tutorsCapacityReached &&
                    'capacity-indicator-at-limit bg-[rgb(var(--color-error)_/_0.15)] text-[rgb(var(--color-error))] border-[rgb(var(--color-error))]',
                )}
              >
                {tutors.length}/{maxTutors || '∞'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[80px]">
              {tutors.length > 0 ? (
                mode === 'matching' && sessionId ? (
                  tutors.map((user) => {
                    const matchedStudents = getTutorMatchedStudents?.(user.id) || [];
                    const availability = tutorAvailabilityById?.[user.id];
                    const slotAvailability = availability?.status;
                    const slotConflictHint = formatConflictHint(availability?.conflictingSession);
                    return (
                      <TutorChipWithMatches
                        key={user.id}
                        tutor={user}
                        matchedStudents={matchedStudents}
                        onRemove={() => onRemoveTutor(user.id)}
                        sessionId={sessionId}
                        onStudentRemove={(studentId) => onUnmatchStudent?.(studentId, user.id)}
                        hideMatchCountBadge={hideTutorMatchCount}
                        slotAvailability={slotAvailability}
                        slotConflictHint={slotConflictHint}
                      />
                    );
                  })
                ) : (
                  tutors.map((user) => {
                    const availability = tutorAvailabilityById?.[user.id];
                    const slotAvailability = availability?.status;
                    const slotConflictHint = formatConflictHint(availability?.conflictingSession);
                    return (
                      <RemovableParticipantChip
                        key={user.id}
                        user={user}
                        role={user.currentRole || 'tutor'}
                        onRemove={() => onRemoveTutor(user.id)}
                        slotAvailability={slotAvailability}
                        slotConflictHint={slotConflictHint}
                      />
                    );
                  })
                )
              ) : (
                <div className="flex items-center justify-center w-full py-6 text-xs text-muted-foreground">
                  Glissez des tuteurs ici
                </div>
              )}
            </div>
          </div>

          {/* Section Élèves - Droite */}
          <div className="pl-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-1-nuance-3)]">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--color-3-nuance-1)]" />
                <h5 className="font-semibold text-sm text-[var(--color-1-nuance-1)] uppercase tracking-wide">
                  Élèves
                </h5>
              </div>
              <span
                className={cn(
                  'capacity-indicator text-xs font-bold px-2.5 py-1 rounded-full',
                  'bg-[color-mix(in_srgb,var(--color-1-nuance-1)_12%,transparent)]',
                  'text-[var(--color-1-nuance-1)] border border-[var(--color-1-nuance-1)]',
                  studentsCapacityReached &&
                    'capacity-indicator-at-limit bg-[rgb(var(--color-error)_/_0.15)] text-[rgb(var(--color-error))] border-[rgb(var(--color-error))]',
                )}
              >
                {unmatchedStudents.length}/{maxStudents || '∞'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[80px]">
              {unmatchedStudents.length > 0 ? (
                unmatchedStudents.map((user) => (
                  <RemovableParticipantChip
                    key={user.id}
                    user={user}
                    role="student"
                    onRemove={() => onRemoveStudent(user.id)}
                    draggable={mode === 'matching'}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center w-full py-6 text-xs text-muted-foreground">
                  Glissez des élèves ici
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning si capacité atteinte pendant drop */}
      {showCapacityWarning && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--color-error)_/_0.12)] border-2 border-[rgb(var(--color-error))] rounded-xl pointer-events-none animate-shake z-10">
          <span className="text-sm font-bold text-[rgb(var(--color-error))] bg-white dark:bg-[rgb(var(--card-rgb))] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {activeDragType === 'tutor'
              ? `Capacité maximale tuteurs atteinte (${maxTutors})`
              : `Capacité maximale élèves atteinte (${maxStudents})`}
          </span>
        </div>
      )}

      {/* Warning si capacité dépassée (données existantes) */}
      {(studentsOverCapacity > 0 || tutorsOverCapacity > 0) && (
        <div className="mt-3 p-3 bg-[rgb(var(--color-error)_/_0.08)] border border-[rgb(var(--color-error)_/_0.3)] rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[rgb(var(--color-error))] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[rgb(var(--color-error))]">
              <p className="font-semibold mb-1">Capacité dépassée</p>
              {studentsOverCapacity > 0 && (
                <p>
                  Vous devez retirer {studentsOverCapacity} élève
                  {studentsOverCapacity > 1 ? 's' : ''} (capacité max: {maxStudents})
                </p>
              )}
              {tutorsOverCapacity > 0 && (
                <p>
                  Vous devez retirer {tutorsOverCapacity} tuteur{tutorsOverCapacity > 1 ? 's' : ''}{' '}
                  (capacité max: {maxTutors})
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
