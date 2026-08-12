import * as React from 'react';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { MatchingUserColumn } from '@/components/matching/MatchingUserColumn';
import {
  MatchingSessionsColumn,
  SessionHandlers,
} from '@/components/matching/MatchingSessionsColumn';
import { CustomDragOverlay } from '@/components/sessions/CustomDragOverlay';
import { SlidePanel } from '@/components/common/SlidePanel';
import { CreateTutorView } from '@/components/tutors/CreateTutorView';
import { CreateStudentView } from '@/components/students/CreateStudentView';
import { CreateSessionView } from '@/components/sessions/CreateSessionView';
import { useConnectedUser } from '@/hooks/useConnectedUser';
import { prependUserToUsersSearchCaches } from '@/utils/created-user-profile';
import type { UserWithProfile } from '@/types/user.types';

/**
 * ConfigureMatchingView — Layout 3 colonnes avec DnD
 *
 * - Gauche : tuteurs (MatchingUserColumn)
 * - Centre : séances (MatchingSessionsColumn — autonome)
 * - Droite : élèves (MatchingUserColumn)
 */

interface ConfigureMatchingViewProps {
  selectedDates?: Date[];
  onSetSelectedDates?: (dates: Date[]) => void;
}

export const ConfigureMatchingView: React.FC<ConfigureMatchingViewProps> = ({
  selectedDates = [],
  onSetSelectedDates,
}) => {
  const { user: connectedUser, isVolunteer } = useConnectedUser();
  const queryClient = useQueryClient();

  // ── Panels de création rapide ─────────────────────────────────────────────
  const [isTutorPanelOpen, setIsTutorPanelOpen] = React.useState(false);
  const [isStudentPanelOpen, setIsStudentPanelOpen] = React.useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = React.useState(false);

  // ── DnD ───────────────────────────────────────────────────────────────────
  const [activeDragUser, setActiveDragUser] = React.useState<UserWithProfile | null>(null);
  const [activeDragType, setActiveDragType] = React.useState<'student' | 'tutor' | null>(null);

  // ── État partagé avec MatchingSessionsColumn via callbacks ────────────────
  const [currentExpandedSessionId, setCurrentExpandedSessionId] = React.useState<string | null>(
    null,
  );
  const [participantsVersion, setParticipantsVersion] = React.useState(0);

  // ── sessionHandlersRef — lu par handleDragEnd ─────────────────────────────
  const sessionHandlersRef = React.useRef<Map<string, SessionHandlers>>(new Map());

  const registerSessionHandlers = React.useCallback(
    (sessionId: string, handlers: SessionHandlers) => {
      sessionHandlersRef.current.set(sessionId, handlers);
    },
    [],
  );

  const handleSessionToggled = React.useCallback((expandedSessionId: string | null) => {
    setCurrentExpandedSessionId(expandedSessionId);
  }, []);

  const handleParticipantsChange = React.useCallback(() => {
    setParticipantsVersion((v) => v + 1);
  }, []);

  const excludedTutorIds = React.useMemo(() => {
    if (!currentExpandedSessionId) return [];
    const handlers = sessionHandlersRef.current.get(currentExpandedSessionId);
    if (!handlers?.getTempTutors) return [];
    return handlers.getTempTutors().map((t) => t.id);
  }, [currentExpandedSessionId, participantsVersion]);

  const isConnectedVolunteerInParticipants = React.useMemo(() => {
    if (!isVolunteer || !connectedUser || !currentExpandedSessionId) return false;
    return excludedTutorIds.includes(connectedUser.id);
  }, [isVolunteer, connectedUser, currentExpandedSessionId, excludedTutorIds]);

  // Le pageSize pour tutors ne doit être réduit que si le volunteer sera épinglé
  // (c'est-à-dire s'il n'est pas déjà participant)
  const tutorsPageSize = isVolunteer && !isConnectedVolunteerInParticipants ? 9 : 10;

  const excludedStudentIds = React.useMemo(() => {
    if (!currentExpandedSessionId) return [];
    const handlers = sessionHandlersRef.current.get(currentExpandedSessionId);
    if (!handlers?.getTempStudents || !handlers?.getSpecificMatches) return [];
    const tempStudents = handlers.getTempStudents();
    const specificMatches = handlers.getSpecificMatches();
    const matchedStudentIds = specificMatches.map((m) => m.studentId);
    return [...tempStudents.map((s) => s.id), ...matchedStudentIds];
  }, [currentExpandedSessionId, participantsVersion]);

  // ── Comptage matchings par tuteur ─────────────────────────────────────────
  const getTutorMatchCount = React.useCallback(
    (tutorId: string): number => {
      if (!currentExpandedSessionId) return 0;
      const handlers = sessionHandlersRef.current.get(currentExpandedSessionId);
      if (!handlers?.getSpecificMatches) return 0;
      return handlers.getSpecificMatches().filter((m) => m.tutorId === tutorId).length;
    },
    [currentExpandedSessionId, participantsVersion],
  );

  // ── Double-click raccourcis ────────────────────────────────────────────────
  const handleTutorDoubleClick = React.useCallback(
    (user: UserWithProfile) => {
      if (!currentExpandedSessionId) return;
      const handlers = sessionHandlersRef.current.get(currentExpandedSessionId);
      handlers?.handleAddTutor?.(user);
    },
    [currentExpandedSessionId],
  );

  const handleStudentDoubleClick = React.useCallback(
    (user: UserWithProfile) => {
      if (!currentExpandedSessionId) return;
      const handlers = sessionHandlersRef.current.get(currentExpandedSessionId);
      if (handlers?.handleAddStudent && handlers?.getTempStudents) {
        const isAlreadyParticipant = handlers.getTempStudents().some((s) => s.id === user.id);
        if (!isAlreadyParticipant) {
          handlers.handleAddStudent(user);
        }
      }
    },
    [currentExpandedSessionId],
  );

  // ── DnD sensors + handlers ────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Collision detection: pointerWithin priorise le droppable sous le curseur exact
  // (évite que la grande UnifiedDropZone "vole" le drop destiné à un TutorChipWithMatches)
  // puis fallback closestCenter si aucun droppable ne contient le curseur.
  const collisionDetection: CollisionDetection = React.useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCenter(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current;
    const user = activeData?.user as UserWithProfile | undefined;
    // Supporte les deux formats de data :
    //   - DraggableUserCard (MatchingUserColumn) → { roleGroup: 'students'|'tutors'|'volunteers', user }
    //   - RemovableParticipantChip (participants déjà ajoutés) → { type: 'student'|'tutor'|'volunteer', user }
    const roleGroup = activeData?.roleGroup as string | undefined;
    const type = activeData?.type as string | undefined;

    const isTutor =
      roleGroup === 'tutors' ||
      roleGroup === 'volunteers' ||
      type === 'tutor' ||
      type === 'volunteer';
    const isStudent = roleGroup === 'students' || type === 'student';

    if (isTutor && user) {
      setActiveDragUser(user);
      setActiveDragType('tutor');
    } else if (isStudent && user) {
      setActiveDragUser(user);
      setActiveDragType('student');
    }
  };

  // ── Helpers pour handleDragEnd (réduction complexité cognitive) ───────────
  const handleStudentToTutorChipDrop = React.useCallback(
    (student: UserWithProfile, sessionId: string, tutorId: string) => {
      const handlers = sessionHandlersRef.current.get(sessionId);
      if (
        !handlers?.handleMatchStudentToTutor ||
        !handlers?.handleAddStudent ||
        !handlers?.getTempStudents ||
        !handlers?.getSpecificMatches ||
        !handlers?.handleUnmatchStudent
      ) {
        return;
      }

      const isAlreadyParticipant = handlers.getTempStudents().some((s) => s.id === student.id);
      if (isAlreadyParticipant) {
        const existingMatches = handlers.getSpecificMatches();
        const oldMatch = existingMatches.find((m) => m.studentId === student.id);
        if (oldMatch && oldMatch.tutorId !== tutorId) {
          handlers.handleUnmatchStudent(student.id, oldMatch.tutorId);
        }
      } else {
        handlers.handleAddStudent(student);
      }

      handlers.handleMatchStudentToTutor(student.id, tutorId);
      setParticipantsVersion((v) => v + 1);
    },
    [],
  );

  const handleTutorToDropzoneDrop = React.useCallback(
    (tutor: UserWithProfile, sessionId: string) => {
      const handlers = sessionHandlersRef.current.get(sessionId);
      if (handlers?.handleAddTutor) {
        handlers.handleAddTutor(tutor);
        setParticipantsVersion((v) => v + 1);
      }
    },
    [],
  );

  const handleStudentToDropzoneDrop = React.useCallback(
    (student: UserWithProfile, sessionId: string) => {
      const handlers = sessionHandlersRef.current.get(sessionId);
      if (!handlers?.handleAddStudent || !handlers?.getTempStudents) {
        return;
      }

      const isAlreadyParticipant = handlers.getTempStudents().some((s) => s.id === student.id);
      if (!isAlreadyParticipant) {
        handlers.handleAddStudent(student);
      }
      setParticipantsVersion((v) => v + 1);
    },
    [],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    const activeUser = activeDragUser;
    const activeType = activeDragType;

    setActiveDragUser(null);
    setActiveDragType(null);

    if (!over || !activeUser || !activeType) return;

    const overData = over.data.current;
    const overType = overData?.type as string | undefined;
    const sessionId = overData?.sessionId as string | undefined;

    if (!sessionId) return;

    // CAS 1: Drop élève sur chip tuteur → matching spécifique élève→tuteur
    if (activeType === 'student' && overType === 'tutor-chip') {
      const tutorId = overData?.tutorId as string | undefined;
      if (tutorId) {
        handleStudentToTutorChipDrop(activeUser, sessionId, tutorId);
      }
      return;
    }

    // CAS 2: Drop tuteur dans dropzone unifiée → ajout participant tuteur
    if (activeType === 'tutor' && overType === 'matching-dropzone-unified') {
      handleTutorToDropzoneDrop(activeUser, sessionId);
      return;
    }

    // CAS 3: Drop élève dans dropzone unifiée → ajout participant élève
    if (activeType === 'student' && overType === 'matching-dropzone-unified') {
      handleStudentToDropzoneDrop(activeUser, sessionId);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="matching-configure-container">
        {isCreateSessionOpen ? (
          <CreateSessionView
            showParticipants
            onClose={() => setIsCreateSessionOpen(false)}
            onSuccess={() => {
              setIsCreateSessionOpen(false);
              queryClient.invalidateQueries({ queryKey: ['sessions-matching'] });
            }}
            className="h-full"
          />
        ) : (
          <div className="matching-configure-layout">
            {/* Colonne Gauche: Tuteurs */}
            <div className="matching-column-left flex flex-col gap-2">
              <MatchingUserColumn
                role="tutor"
                emptyMessage={
                  currentExpandedSessionId
                    ? 'Aucun tuteur disponible pour cette séance'
                    : 'Recherchez un tuteur ou ouvrez une séance'
                }
                excludedIds={excludedTutorIds}
                pageSize={tutorsPageSize}
                getMatchCount={getTutorMatchCount}
                onDoubleClick={handleTutorDoubleClick}
                onCreateClick={() => setIsTutorPanelOpen(true)}
                className="flex-1 min-h-0"
              />
            </div>

            {/* Colonne Centre: Séances */}
            <MatchingSessionsColumn
              selectedDates={selectedDates}
              onRegisterSessionHandlers={registerSessionHandlers}
              onSessionToggled={handleSessionToggled}
              onParticipantsChange={handleParticipantsChange}
              onRequestCreateSession={() => setIsCreateSessionOpen(true)}
              onSetSelectedDates={onSetSelectedDates}
            />

            {/* Colonne Droite: Élèves */}
            <div className="matching-column-right flex flex-col gap-2">
              <MatchingUserColumn
                role="student"
                emptyMessage={
                  currentExpandedSessionId
                    ? 'Aucun élève disponible pour cette séance'
                    : 'Recherchez un élève ou ouvrez une séance'
                }
                excludedIds={excludedStudentIds}
                pageSize={10}
                onDoubleClick={handleStudentDoubleClick}
                onCreateClick={() => setIsStudentPanelOpen(true)}
                className="flex-1 min-h-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <CustomDragOverlay activeUser={activeDragUser} />

      {/* Panel création tuteur */}
      <SlidePanel isOpen={isTutorPanelOpen} onClose={() => setIsTutorPanelOpen(false)}>
        <CreateTutorView
          onClose={() => setIsTutorPanelOpen(false)}
          onSuccess={(created) => {
            setIsTutorPanelOpen(false);
            prependUserToUsersSearchCaches(queryClient, 'tutor', created);
          }}
        />
      </SlidePanel>

      {/* Panel création élève */}
      <SlidePanel isOpen={isStudentPanelOpen} onClose={() => setIsStudentPanelOpen(false)}>
        <CreateStudentView
          onClose={() => setIsStudentPanelOpen(false)}
          onSuccess={(created) => {
            setIsStudentPanelOpen(false);
            prependUserToUsersSearchCaches(queryClient, 'student', created);
          }}
        />
      </SlidePanel>
    </DndContext>
  );
};
