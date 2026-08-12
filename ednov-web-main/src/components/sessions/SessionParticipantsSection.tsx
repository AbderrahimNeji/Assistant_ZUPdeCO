import * as React from 'react';
import { Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MatchingUserColumn } from '@/components/matching/MatchingUserColumn';
import { UnifiedDropZone } from '@/components/matching/UnifiedDropZone';
import { SlidePanel } from '@/components/common/SlidePanel';
import { CreateTutorView } from '@/components/tutors/CreateTutorView';
import { CreateStudentView } from '@/components/students/CreateStudentView';
import { prependUserToUsersSearchCaches } from '@/utils/created-user-profile';
import type { UserWithProfile } from '@/types/user.types';
import { SessionTutorAvailabilityBanner } from './SessionTutorAvailabilityBanner';
import type { TutorAvailabilityById } from './session-tutor-availability';

interface SessionParticipantsSectionProps {
  selectedTutors: UserWithProfile[];
  selectedStudents: UserWithProfile[];
  selectedTutorIds: string[];
  selectedStudentIds: string[];
  maxTutors: number | null;
  maxStudents: number | null;
  onRemoveTutor: (userId: string) => void;
  onRemoveStudent: (userId: string) => void;
  onTutorDoubleClick: (user: UserWithProfile) => void | Promise<void>;
  onStudentDoubleClick: (user: UserWithProfile) => void;
  establishmentId?: string;
  establishmentName?: string;
  /** Mode matching (édition de séance avec binômes) */
  sessionId?: string;
  specificMatches?: Array<{ studentId: string; tutorId: string }>;
  getTutorMatchedStudents?: (tutorId: string) => Array<
    UserWithProfile & {
      assignmentSource?: 'manual' | 'auto_binome_coeur' | 'auto_history' | 'auto_balanced';
    }
  >;
  dropZoneMode?: 'unified' | 'matching';
  studentsOverCapacity?: number;
  tutorAvailabilityById?: TutorAvailabilityById;
  tutorAvailabilityHint?: string | null;
  tutorAvailabilityChecking?: boolean;
}

export const SessionParticipantsSection: React.FC<SessionParticipantsSectionProps> = ({
  selectedTutors,
  selectedStudents,
  selectedTutorIds,
  selectedStudentIds,
  maxTutors,
  maxStudents,
  onRemoveTutor,
  onRemoveStudent,
  onTutorDoubleClick,
  onStudentDoubleClick,
  establishmentId,
  establishmentName,
  sessionId,
  specificMatches,
  getTutorMatchedStudents,
  dropZoneMode = 'unified',
  studentsOverCapacity = 0,
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

  return (
    <>
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        {/* Colonne gauche - Tuteurs */}
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

        {/* Colonne centrale - Dropzone */}
        <div className="col-span-12 lg:col-span-6 min-h-0">
          <div className="section-card h-full flex flex-col">
            <div className="section-header flex-shrink-0">
              <h3 className="section-title text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants
              </h3>
              {(selectedTutors.length > 0 || selectedStudents.length > 0) && (
                <span className="text-sm font-medium text-[var(--color-2-nuance-1)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)] px-2 py-1 rounded-full">
                  {selectedTutors.length + selectedStudents.length}
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-2">
              <SessionTutorAvailabilityBanner
                message={tutorAvailabilityHint ?? null}
                isChecking={tutorAvailabilityChecking}
              />
              <UnifiedDropZone
                tutors={selectedTutors}
                students={selectedStudents}
                maxTutors={maxTutors}
                maxStudents={maxStudents}
                onRemoveTutor={onRemoveTutor}
                onRemoveStudent={onRemoveStudent}
                sessionId={sessionId}
                specificMatches={specificMatches}
                getTutorMatchedStudents={getTutorMatchedStudents}
                mode={dropZoneMode}
                studentsOverCapacity={studentsOverCapacity}
                tutorAvailabilityById={tutorAvailabilityById}
              />
            </div>
          </div>
        </div>

        {/* Colonne droite - Élèves */}
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
