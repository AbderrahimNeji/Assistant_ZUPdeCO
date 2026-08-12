import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Users, AlertCircle, Zap } from 'lucide-react';
import { MatchingUserColumn } from '@/components/matching/MatchingUserColumn';
import { UnifiedDropZone } from '@/components/matching/UnifiedDropZone';
import { Button } from '@/components/forms/Button';
import { Spinner } from '@/components/ui/spinner';
import { SlidePanel } from '@/components/common/SlidePanel';
import { CreateTutorView } from '@/components/tutors/CreateTutorView';
import { CreateStudentView } from '@/components/students/CreateStudentView';
import { prependUserToUsersSearchCaches } from '@/utils/created-user-profile';
import type { UserWithProfile } from '@/types/user.types';
import { getFloatingVscTutorIds } from './session-participant-rules';
import { SessionTutorAvailabilityBanner } from './SessionTutorAvailabilityBanner';
import type { TutorAvailabilityById } from './session-tutor-availability';

/** Identifiant placeholder pour la dropzone matching avant que la séance ait un vrai id. */
export const NEW_SESSION_DROP_ID = 'new-session';

interface SessionGroupsSectionProps {
  selectedTutors: UserWithProfile[];
  selectedStudents: UserWithProfile[];
  selectedTutorIds: string[];
  selectedStudentIds: string[];
  /** Map studentId → tutorId (source de vérité des bin\u00f4mes). */
  studentToTutor: Record<string, string>;
  maxTutors: number | null;
  maxStudents: number | null;
  onRemoveTutor: (userId: string) => void;
  onRemoveStudent: (userId: string) => void;
  onUnmatchStudent: (studentId: string, tutorId: string) => void;
  onTutorDoubleClick: (user: UserWithProfile) => void | Promise<void>;
  onStudentDoubleClick: (user: UserWithProfile) => void;
  onAutoAssign: () => void;
  /** Pendant l’appel API de proposition d’affectation automatique. */
  autoAssignPending?: boolean;
  establishmentId?: string;
  establishmentName?: string;
  tutorAvailabilityById?: TutorAvailabilityById;
  tutorAvailabilityHint?: string | null;
  tutorAvailabilityChecking?: boolean;
}

/**
 * Section "Groupes" pour les types `homework_help`, `workshop` et `group_tutoring`.
 * Réutilise `UnifiedDropZone` en mode `matching` (mêmes patterns que la page matching) :
 *  - Colonne gauche : tuteurs disponibles
 *  - Colonne centrale : tuteurs sélectionnés avec élèves matchés nested + élèves orphelins
 *  - Colonne droite : élèves disponibles
 * Le bouton "Affectation auto" répartit les élèves restants entre les tuteurs.
 */
export const SessionGroupsSection: React.FC<SessionGroupsSectionProps> = ({
  selectedTutors,
  selectedStudents,
  selectedTutorIds,
  selectedStudentIds,
  studentToTutor,
  maxTutors,
  maxStudents,
  onRemoveTutor,
  onRemoveStudent,
  onUnmatchStudent,
  onTutorDoubleClick,
  onStudentDoubleClick,
  onAutoAssign,
  autoAssignPending = false,
  establishmentId,
  establishmentName,
  tutorAvailabilityById,
  tutorAvailabilityHint,
  tutorAvailabilityChecking = false,
}) => {
  const queryClient = useQueryClient();
  const [isTutorPanelOpen, setIsTutorPanelOpen] = React.useState(false);
  const [isStudentPanelOpen, setIsStudentPanelOpen] = React.useState(false);

  const handleTutorCreatedSuccess = React.useCallback(
    (created: UserWithProfile) => {
      setIsTutorPanelOpen(false);
      prependUserToUsersSearchCaches(queryClient, 'tutor', created);
    },
    [queryClient],
  );

  const handleStudentCreatedSuccess = React.useCallback(
    (created: UserWithProfile) => {
      setIsStudentPanelOpen(false);
      prependUserToUsersSearchCaches(queryClient, 'student', created);
    },
    [queryClient],
  );

  // Format attendu par UnifiedDropZone : [{ studentId, tutorId }]
  const specificMatches = React.useMemo(
    () => Object.entries(studentToTutor).map(([studentId, tutorId]) => ({ studentId, tutorId })),
    [studentToTutor],
  );

  const getTutorMatchedStudents = React.useCallback(
    (tutorId: string) => selectedStudents.filter((s) => studentToTutor[s.id] === tutorId),
    [selectedStudents, studentToTutor],
  );

  const orphanStudents = React.useMemo(
    () => selectedStudents.filter((s) => !studentToTutor[s.id]),
    [selectedStudents, studentToTutor],
  );

  const floatingVscTutors = React.useMemo(() => {
    const ids = new Set(getFloatingVscTutorIds(selectedTutors, studentToTutor));
    return selectedTutors.filter((t) => ids.has(t.id));
  }, [selectedTutors, studentToTutor]);

  return (
    <>
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        {/* Colonne gauche - Tuteurs disponibles */}
        <div className="col-span-12 lg:col-span-3 min-h-0">
          <MatchingUserColumn
            role="tutor"
            emptyMessage="Aucun tuteur disponible"
            excludedIds={selectedTutorIds}
            pageSize={10}
            onDoubleClick={onTutorDoubleClick}
            onCreateClick={() => setIsTutorPanelOpen(true)}
            initialEstablishmentId={establishmentId}
            initialEstablishmentName={establishmentName}
          />
        </div>

        {/* Colonne centrale - Groupes (UnifiedDropZone en mode matching) */}
        <div className="col-span-12 lg:col-span-6 min-h-0">
          <div className="section-card relative h-full flex flex-col overflow-hidden">
            <div className="section-header flex-shrink-0 flex items-center justify-between gap-2">
              <h3 className="section-title text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Groupes
                {specificMatches.length > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: 'color-mix(in srgb, var(--color-3-nuance-1) 15%, transparent)',
                      color: 'var(--color-3-nuance-1)',
                      borderColor: 'var(--color-3-nuance-1)',
                    }}
                  >
                    {specificMatches.length} {specificMatches.length > 1 ? 'matchings' : 'matching'}
                  </span>
                )}
              </h3>
              <Button
                variant="outline"
                size="sm"
                icon={Zap}
                iconPosition="left"
                onClick={onAutoAssign}
                loading={autoAssignPending}
                disabled={
                  selectedTutors.length === 0 || selectedStudents.length === 0 || autoAssignPending
                }
                title="Répartir équitablement les élèves entre les tuteurs"
              >
                Affectation auto
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <SessionTutorAvailabilityBanner
                message={tutorAvailabilityHint ?? null}
                isChecking={tutorAvailabilityChecking}
              />
              <UnifiedDropZone
                mode="matching"
                sessionId={NEW_SESSION_DROP_ID}
                tutors={selectedTutors}
                students={selectedStudents}
                maxTutors={maxTutors}
                maxStudents={maxStudents}
                specificMatches={specificMatches}
                getTutorMatchedStudents={getTutorMatchedStudents}
                onRemoveTutor={onRemoveTutor}
                onRemoveStudent={onRemoveStudent}
                onUnmatchStudent={onUnmatchStudent}
                hideTutorMatchCount
                tutorAvailabilityById={tutorAvailabilityById}
              />

              {floatingVscTutors.length > 0 && specificMatches.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border border-[var(--color-1-nuance-3)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_8%,transparent)]">
                  <p className="text-sm text-[var(--color-1-nuance-1)]">
                    <span className="font-semibold">VSC sans élève :</span>{' '}
                    {floatingVscTutors.map((t) => `${t.firstName} ${t.lastName}`.trim()).join(', ')}{' '}
                    — sera ajouté comme participant sur chaque séance créée pour les autres groupes
                    (pas de séance dédiée).
                  </p>
                </div>
              )}

              {/* Bandeau d'alerte : élèves orphelins (non assignés à un tuteur) */}
              {orphanStudents.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border border-[rgb(var(--color-warning)_/_0.4)] bg-[rgb(var(--color-warning)_/_0.08)]">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[rgb(var(--color-warning))]" />
                    <div className="text-sm text-[rgb(var(--color-warning))]">
                      <p className="font-semibold mb-1">
                        {orphanStudents.length} élève{orphanStudents.length > 1 ? 's' : ''} sans
                        groupe
                      </p>
                      <p className="text-xs">
                        Glissez chaque élève sous un tuteur ou utilisez l'affectation automatique.
                        La séance ne pourra pas être créée tant que des élèves restent orphelins.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {autoAssignPending && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-start gap-2 bg-background/80 backdrop-blur-[2px] pt-40 sm:pt-48"
                aria-busy="true"
                aria-live="polite"
              >
                <Spinner size="lg" label="Calcul de la suggestion d'affectation…" />
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite - Élèves disponibles */}
        <div className="col-span-12 lg:col-span-3 min-h-0">
          <MatchingUserColumn
            role="student"
            emptyMessage="Aucun élève disponible"
            excludedIds={selectedStudentIds}
            pageSize={10}
            onDoubleClick={onStudentDoubleClick}
            onCreateClick={() => setIsStudentPanelOpen(true)}
            initialEstablishmentId={establishmentId}
            initialEstablishmentName={establishmentName}
          />
        </div>
      </div>

      <SlidePanel isOpen={isTutorPanelOpen} onClose={() => setIsTutorPanelOpen(false)}>
        <CreateTutorView
          onClose={() => setIsTutorPanelOpen(false)}
          onSuccess={handleTutorCreatedSuccess}
        />
      </SlidePanel>

      <SlidePanel isOpen={isStudentPanelOpen} onClose={() => setIsStudentPanelOpen(false)}>
        <CreateStudentView
          onClose={() => setIsStudentPanelOpen(false)}
          onSuccess={handleStudentCreatedSuccess}
        />
      </SlidePanel>
    </>
  );
};
