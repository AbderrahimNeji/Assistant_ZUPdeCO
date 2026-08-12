import * as React from 'react';
import { useEffect, FC } from 'react';
import {
  DndContext,
  pointerWithin,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UnifiedDropZone } from '@/components/matching/UnifiedDropZone';
import { SlidePanel } from '@/components/common/SlidePanel';
import { CreateTutorView } from '@/components/tutors/CreateTutorView';
import { CreateStudentView } from '@/components/students/CreateStudentView';
import { SessionFormCenter } from './SessionFormCenter';
import { SessionParticipantsSection } from './SessionParticipantsSection';
import { SessionGroupsSection } from './SessionGroupsSection';
import { AutoAssignmentProposalModal } from './AutoAssignmentProposalModal';
import { CustomDragOverlay } from './CustomDragOverlay';
import {
  buildSessionPairs,
  getMaxTutorsForSessionType,
  isGroupSessionType,
  studentToTutorFromPairs,
  tutorLimitMessageForSessionType,
  buildGroupModeUpdateParticipantPayload,
  facilitatorRoleForSession,
  validateGroupCreateTutorsHaveStudents,
  validateMinParticipants,
  validateOrphanStudentsForGroupMode,
} from './session-participant-rules';
import { proposeDraftAutoAssignment } from '@/services/matching.service';
import type { AutoAssignmentProposal } from '@/types/matching.types';
import { Button } from '@/components/forms/Button';
import { Spinner } from '@/components/ui/spinner';
import { X, Save, Edit } from 'lucide-react';
import { cn, formatDateForInput } from '@/lib/utils';
import { useSessionFormData } from '@/hooks/useSessionFormData';
import { useSessionTutorAvailability } from '@/hooks/useSessionTutorAvailability';
import {
  buildSubmitBlockedMessage,
  ensureTutorAvailableForAdd,
} from '@/components/sessions/session-tutor-availability';
import { getSession, updateSession } from '@/services/sessions.service';
import type {
  SessionType,
  SessionFormat,
  SessionMode,
  RecurrenceType,
  RecurrenceUpdateScope,
  UpdateSessionDto,
  CreateActivityDto,
  CreateActivityTypeDto,
} from '@/types/session.types';
import type { UserWithProfile } from '@/types/user.types';
import type { ActivityType } from '@/types/activity.types';
import { toast } from '@/lib/toast';
import { useFormValidation } from '@/hooks/useFormValidation';
import {
  sessionValidationSchema,
  activityConfigValidationSchema,
  activityTypeValidationSchema,
} from '@/utils/validation-schemas';
import { getActivityTypes, getSchoolClasses } from '@/services/academic.service';
import { getEstablishment } from '@/services/establishments.service';
import { getSpecialties } from '@/services/specialties.service';

interface EditSessionViewProps {
  sessionId: string;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
}

export const EditSessionView: FC<EditSessionViewProps> = ({
  sessionId,
  onClose,
  onSuccess,
  className,
}) => {
  // Chargement de la session existante
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => getSession(sessionId),
  });

  // Form state
  const [sessionData, setSessionData] = React.useState<{
    establishmentId: string;
    roomId: string;
    programId: string;
    levelIds: string[];
    subjectIds: string[];
    classId: string;
    specialtyIds: string[];
    activityId: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    type: SessionType;
    sessionFormat: SessionFormat;
    mode: SessionMode;
    recurrenceType: RecurrenceType;
    recurrenceRule: Record<string, unknown> | null;
    topic: string;
    joinLink: string;
    planDuringHolidays: boolean;
    internalNotes: string;
  }>({
    establishmentId: '',
    roomId: '',
    programId: '',
    levelIds: [],
    subjectIds: [],
    classId: '',
    specialtyIds: [],
    activityId: '',
    sessionDate: '',
    startTime: '',
    endTime: '',
    type: 'homework_help',
    sessionFormat: 'in_person',
    mode: 'single',
    recurrenceType: 'none',
    recurrenceRule: null,
    topic: '',
    joinLink: '',
    planDuringHolidays: true,
    internalNotes: '',
  });

  const [selectedTutors, setSelectedTutors] = React.useState<UserWithProfile[]>([]);
  const [selectedStudents, setSelectedStudents] = React.useState<UserWithProfile[]>([]);

  const [recurrenceUpdateScope, setRecurrenceUpdateScope] =
    React.useState<RecurrenceUpdateScope>('occurrence');

  const [studentToTutor, setStudentToTutor] = React.useState<Record<string, string>>({});
  const [autoProposal, setAutoProposal] = React.useState<AutoAssignmentProposal | null>(null);
  const [proposalModalOpen, setProposalModalOpen] = React.useState(false);

  const isGroupMode = isGroupSessionType(sessionData.type);

  // Pré-population des données
  useEffect(() => {
    if (session) {
      setRecurrenceUpdateScope('occurrence');
      const initialData = {
        establishmentId: session.establishmentId ?? session.establishment?.id ?? '',
        roomId: session.roomId || '',
        programId: session.programId || '',
        levelIds: session.levelIds ?? [],
        subjectIds: session.subjectIds ?? [],
        classId: session.classId || '',
        specialtyIds: session.specialtyIds ?? [],
        activityId: session.activityId || '',
        sessionDate: formatDateForInput(new Date(session.sessionDate)),
        startTime: session.startTime,
        endTime: session.endTime,
        type: session.type,
        sessionFormat: session.sessionFormat,
        mode: session.mode,
        recurrenceType: session.recurrenceType,
        recurrenceRule: session.recurrenceRule ?? null,
        topic: session.topic || '',
        joinLink: session.joinLink || '',
        planDuringHolidays: session.planDuringHolidays ?? true,
        internalNotes: session.internalNotes || '',
      };
      setSessionData(initialData);
      validation.validateInitialFormData(initialData);

      // Charger les participants existants
      if (session.participants) {
        const tutors = session.participants
          .filter((p) => p.role === 'tutor' || p.role === 'volunteer')
          .map((p) => ({
            ...p.user,
            currentRole: p.role as 'tutor' | 'volunteer',
          }));
        const students = session.participants
          .filter((p) => p.role === 'student')
          .map((p) => ({
            ...p.user,
            currentRole: 'student' as const,
          }));

        setSelectedTutors(tutors);
        setSelectedStudents(students);
      }

      if (session.studentTutorPairs?.length) {
        setStudentToTutor(studentToTutorFromPairs(session.studentTutorPairs));
      } else {
        setStudentToTutor({});
      }
    }
  }, [session]);

  // Calcul optimisé des excludedIds avec useMemo
  const selectedTutorIds = React.useMemo(() => selectedTutors.map((t) => t.id), [selectedTutors]);

  const selectedStudentIds = React.useMemo(
    () => selectedStudents.map((s) => s.id),
    [selectedStudents],
  );

  const sessionSlot = React.useMemo(
    () => ({
      sessionDate: sessionData.sessionDate,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
    }),
    [sessionData.sessionDate, sessionData.startTime, sessionData.endTime],
  );

  const tutorAvailability = useSessionTutorAvailability({
    tutors: selectedTutors,
    slot: sessionSlot,
    excludeSessionId: sessionId,
  });

  const [isCheckingSubmit, setIsCheckingSubmit] = React.useState(false);

  const { data: activityTypesData = [] } = useQuery<ActivityType[]>({
    queryKey: ['activityTypes'],
    queryFn: async () => {
      const response = await getActivityTypes();
      return response.data;
    },
  });

  const selectedEstablishmentId = sessionData.establishmentId;
  const selectedLevelIds = sessionData.levelIds;

  const { data: selectedEstablishmentDetail } = useQuery({
    queryKey: ['establishment', selectedEstablishmentId],
    queryFn: () => getEstablishment(selectedEstablishmentId),
    enabled: !!selectedEstablishmentId,
    staleTime: 5 * 60 * 1000,
  });

  // Charger toutes les classes de l'établissement, filtrer par niveaux côté frontend
  const { data: schoolClassesRes } = useQuery({
    queryKey: ['school-classes-session', selectedEstablishmentId],
    queryFn: () =>
      getSchoolClasses({
        establishmentId: selectedEstablishmentId || undefined,
        pageSize: 200,
      }),
    enabled: !!selectedEstablishmentId && selectedLevelIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allSpecialties = [] } = useQuery({
    queryKey: ['specialties', 'active'],
    queryFn: () => getSpecialties(true),
    staleTime: 10 * 60 * 1000,
  });

  const isLycee = selectedEstablishmentDetail?.type === 'lycee';

  // Classes filtrées par les niveaux sélectionnés
  const schoolClasses = React.useMemo(() => {
    const all = schoolClassesRes?.data ?? [];
    if (selectedLevelIds.length === 0) return [];
    const levelIdSet = new Set(selectedLevelIds);
    return all.filter((sc) => sc.levelId && levelIdSet.has(sc.levelId));
  }, [schoolClassesRes, selectedLevelIds]);

  // Spécialités liées à au moins un des niveaux sélectionnés, offertes par l'établissement
  const specialtyOptions = React.useMemo(() => {
    if (selectedLevelIds.length === 0 || !selectedEstablishmentDetail?.offeredSpecialties)
      return [];
    const offeredIds = new Set(
      selectedEstablishmentDetail.offeredSpecialties.map((s: { id: string }) => s.id),
    );
    const selectedLevelIdSet = new Set(selectedLevelIds);
    return allSpecialties
      .filter(
        (s) =>
          offeredIds.has(s.id) &&
          s.levelLinks?.some((ll: { level: { id: string } }) =>
            selectedLevelIdSet.has(ll.level.id),
          ),
      )
      .map((s) => ({ value: s.id, label: s.label }));
  }, [selectedLevelIds, selectedEstablishmentDetail, allSpecialties]);

  const formData = useSessionFormData();

  const [activeDragUser, setActiveDragUser] = React.useState<UserWithProfile | null>(null);

  // Inline creation state
  const [showActivityForm, setShowActivityForm] = React.useState(false);
  const [showActivityTypeForm, setShowActivityTypeForm] = React.useState(false);
  const queryClient = useQueryClient();
  const [isTutorPanelOpen, setIsTutorPanelOpen] = React.useState(false);
  const [isStudentPanelOpen, setIsStudentPanelOpen] = React.useState(false);
  const [newActivityData, setNewActivityData] = React.useState<Partial<CreateActivityDto>>({
    code: '',
    label: '',
    description: '',
    canHasCr: false,
    bot: false,
    withLink: false,
    chat: false,
    status: 'active',
  });
  const [newActivityTypeData, setNewActivityTypeData] = React.useState<
    Partial<CreateActivityTypeDto>
  >({
    code: '',
    label: '',
    description: '',
    status: 'active',
  });

  // Validation
  const validation = useFormValidation(sessionValidationSchema);
  const activityValidation = useFormValidation(activityConfigValidationSchema);
  const activityTypeValidation = useFormValidation(activityTypeValidationSchema);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Mutation pour mettre à jour la séance
  const updateMutation = useMutation({
    mutationFn: (dto: UpdateSessionDto) => updateSession(sessionId, dto),
    onSuccess: () => {
      toast.success('Séance modifiée avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification de la séance');
    },
  });

  // Capacités max selon type de séance et activité
  const selectedActivity = formData.activities.find((a) => a.id === sessionData.activityId);

  const getMaxTutors = (): number | null => {
    return getMaxTutorsForSessionType(sessionData.type, selectedActivity?.maxTutors);
  };

  const getMaxStudents = React.useCallback((): number | null => {
    return selectedActivity?.maxStudents ?? null;
  }, [selectedActivity]);

  const maxTutors = getMaxTutors();
  const maxStudents = getMaxStudents();

  const tutorLimitMessage = React.useCallback(
    (incomingName?: string): string =>
      tutorLimitMessageForSessionType(sessionData.type, maxTutors, incomingName),
    [sessionData.type, maxTutors],
  );

  // Gestion du changement de type de séance
  // Track initial load to prevent toast on mount
  const isInitialLoadRef = React.useRef(true);

  React.useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
    // Ne plus retirer automatiquement - afficher un warning à la place
  }, [sessionData.type, sessionData.activityId, getMaxStudents]);

  const collisionDetection: CollisionDetection = React.useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const tutorChipCollision = pointerCollisions.find(
        (c) => c.data?.droppableContainer?.data?.current?.type === 'tutor-chip',
      );
      if (tutorChipCollision) return [tutorChipCollision];
      return pointerCollisions;
    }
    return closestCenter(args);
  }, []);

  // Reset recurrenceRule when recurrenceType changes
  React.useEffect(() => {
    setSessionData((prev) => ({ ...prev, recurrenceRule: null }));
  }, [sessionData.recurrenceType]);

  // Handlers
  const handleFieldChange = (
    field: string,
    value: string | string[] | boolean | Record<string, unknown> | null,
  ) => {
    if (field === 'type' && typeof value === 'string' && value !== sessionData.type) {
      setSelectedTutors([]);
      setSelectedStudents([]);
      setStudentToTutor({});
    }
    setSessionData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === 'establishmentId') {
        newData.classId = '';
        newData.specialtyIds = [];
      }
      if (field === 'levelIds') {
        newData.classId = '';
        newData.specialtyIds = [];
      }
      if (typeof value === 'boolean') {
        validation.validateField(field, value ? 'true' : 'false', newData);
      } else if (Array.isArray(value)) {
        validation.validateField(field, value, newData);
      } else if (typeof value === 'object' && value !== null) {
        validation.validateField(field, value as any, newData);
      } else {
        validation.validateField(field, value as any, newData);
      }
      validation.markAsTouched(field);
      validation.markAsDirty(field);
      return newData;
    });
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const userData = active.data.current?.user as UserWithProfile | undefined;
    const roleGroup = active.data.current?.roleGroup as string | undefined;
    // Ne pas activer l'overlay si un tuteur/volunteer est déplacé sans date ou créneau sélectionné
    if (
      (roleGroup === 'tutors' || roleGroup === 'volunteers') &&
      (!sessionData.sessionDate || !sessionData.startTime || !sessionData.endTime)
    ) {
      return;
    }
    if (userData) {
      setActiveDragUser(userData);
    }
  };

  const ensureTutorAvailable = React.useCallback(
    async (userData: UserWithProfile): Promise<boolean> =>
      ensureTutorAvailableForAdd({
        user: userData,
        slot: sessionSlot,
        selectedTutors,
        maxTutors,
        tutorLimitMessage,
        excludeSessionId: sessionId,
        toast,
      }),
    [sessionSlot, selectedTutors, maxTutors, tutorLimitMessage, sessionId],
  );

  const addTutorToSession = (userData: UserWithProfile) => {
    if (!userData.id) {
      toast.error('Impossible d\u2019ajouter le tuteur : identifiant manquant après la création.');
      return;
    }
    const userWithRole = {
      ...userData,
      currentRole: facilitatorRoleForSession(userData),
    };
    setSelectedTutors((prev) => [...prev, userWithRole]);
    toast.success(`${userData.firstName} ${userData.lastName} ajouté(e) comme tuteur`);
  };

  const addStudentToSession = (userData: UserWithProfile) => {
    if (!userData.id) {
      toast.error(
        'Impossible d\u2019ajouter l\u2019élève : identifiant manquant après la création.',
      );
      return;
    }
    if (maxStudents !== null && selectedStudents.length >= maxStudents) {
      return;
    }
    if (selectedStudents.some((s) => s.id === userData.id)) {
      return;
    }
    setSelectedStudents((prev) => [...prev, { ...userData, currentRole: 'student' as const }]);
    toast.success(`${userData.firstName} ${userData.lastName} ajouté(e) comme élève`);
  };

  const matchStudentToTutor = React.useCallback((student: UserWithProfile, tutorId: string) => {
    setSelectedStudents((prev) =>
      prev.some((s) => s.id === student.id)
        ? prev
        : [...prev, { ...student, currentRole: 'student' as const }],
    );
    setStudentToTutor((prev) => ({ ...prev, [student.id]: tutorId }));
  }, []);

  const handleUnmatchStudent = React.useCallback((studentId: string, tutorId: string) => {
    setStudentToTutor((prev) => {
      if (prev[studentId] !== tutorId) return prev;
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragUser(null);

    if (!over) return;

    const userData = active.data.current?.user as UserWithProfile;
    const roleGroup = active.data.current?.roleGroup as string | undefined;
    const activeType = active.data.current?.type as string | undefined;
    const isTutorDrag =
      roleGroup === 'tutors' ||
      roleGroup === 'volunteers' ||
      activeType === 'tutor' ||
      activeType === 'volunteer';
    const isStudentDrag = roleGroup === 'students' || activeType === 'student';
    const overType = over.data.current?.type as string | undefined;

    if (isGroupMode) {
      if (isStudentDrag && overType === 'tutor-chip') {
        const tutorId = over.data.current?.tutorId as string | undefined;
        if (!tutorId) return;
        matchStudentToTutor(userData, tutorId);
        return;
      }
      if (isTutorDrag && overType === 'matching-dropzone-unified') {
        const ok = await ensureTutorAvailable(userData);
        if (!ok) return;
        addTutorToSession(userData);
        return;
      }
      if (isStudentDrag && overType === 'matching-dropzone-unified') {
        addStudentToSession(userData);
        if (selectedTutors.length > 0) {
          toast.warning('Glissez l\u2019élève sous un tuteur pour l\u2019assigner à un groupe.');
        }
        return;
      }
      return;
    }

    if ((over.id as string) !== 'unified-participants-drop') return;

    if (isTutorDrag) {
      const ok = await ensureTutorAvailable(userData);
      if (!ok) return;
      addTutorToSession(userData);
    } else if (isStudentDrag) {
      addStudentToSession(userData);
    }
  };

  const handleRemoveTutor = (userId: string) => {
    setSelectedTutors((prev) => prev.filter((t) => t.id !== userId));
    setStudentToTutor((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sid) => {
        if (next[sid] === userId) delete next[sid];
      });
      return next;
    });
  };

  const handleRemoveStudent = (userId: string) => {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== userId));
    setStudentToTutor((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const proposeMutation = useMutation({
    mutationFn: proposeDraftAutoAssignment,
    onSuccess: (data) => {
      setAutoProposal(data);
      setProposalModalOpen(true);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' · ') : msg;
      toast.error(
        text || 'Impossible de générer une suggestion d\u2019affectation pour le moment.',
      );
    },
  });

  const handleAutoAssign = React.useCallback(() => {
    if (selectedTutors.length === 0) {
      toast.warning('Ajoutez au moins un tuteur avant l\u2019affectation automatique.');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.warning('Aucun élève à répartir.');
      return;
    }
    if (!sessionData.establishmentId) {
      toast.warning('Sélectionnez un établissement avant l\u2019affectation automatique.');
      return;
    }
    proposeMutation.mutate({
      sessionType: sessionData.type,
      establishmentId: sessionData.establishmentId,
      subjectId: sessionData.subjectIds?.[0] ?? null,
      activityId: sessionData.activityId || null,
      participants: [
        ...selectedTutors.map((t) => ({
          userId: t.id,
          role: facilitatorRoleForSession(t),
        })),
        ...selectedStudents.map((s) => ({ userId: s.id, role: 'student' as const })),
      ],
    });
  }, [
    selectedTutors,
    selectedStudents,
    sessionData.establishmentId,
    sessionData.type,
    sessionData.subjectIds,
    sessionData.activityId,
    proposeMutation,
  ]);

  const handleApplyProposal = React.useCallback(
    (mapping: Record<string, string>) => {
      setStudentToTutor(mapping);
      setProposalModalOpen(false);
      const assigned = Object.keys(mapping).length;
      const unassigned = selectedStudents.length - assigned;
      if (unassigned > 0) {
        toast.warning(
          `Suggestion appliquée : ${assigned} affectation(s). ${unassigned} élève(s) restent sans tuteur.`,
        );
      } else {
        toast.success(`Suggestion appliquée : ${assigned} affectation(s).`);
      }
    },
    [selectedStudents.length],
  );

  const handleTutorDoubleClick = React.useCallback(
    async (user: UserWithProfile) => {
      const ok = await ensureTutorAvailable(user);
      if (!ok) return;
      addTutorToSession(user);
    },
    [ensureTutorAvailable, addTutorToSession],
  );

  const handleStudentDoubleClick = React.useCallback(
    (user: UserWithProfile) => {
      addStudentToSession(user);
      if (isGroupMode && selectedTutors.length === 1) {
        matchStudentToTutor(user, selectedTutors[0].id);
      } else if (isGroupMode && selectedTutors.length > 1) {
        toast.warning('Glissez l\u2019élève sous un tuteur pour l\u2019assigner à un groupe.');
      }
    },
    [addStudentToSession, isGroupMode, selectedTutors, matchStudentToTutor],
  );

  const validateActivityFormData = (): boolean => {
    if (!showActivityForm) return true;

    if (!newActivityData.code || !newActivityData.label) {
      toast.error("Veuillez remplir tous les champs obligatoires de l'activité");
      return false;
    }

    if (showActivityTypeForm) {
      if (!newActivityTypeData.code || !newActivityTypeData.label) {
        toast.error("Veuillez remplir tous les champs obligatoires du type d'activité");
        return false;
      }
    } else if (!newActivityData.activityTypeId) {
      toast.error("Veuillez sélectionner un type d'activité ou en créer un nouveau");
      return false;
    }

    return true;
  };

  const buildActivityData = () => {
    if (!showActivityForm) {
      return {
        activityId: sessionData.activityId || null,
        newActivity: undefined,
        newActivityType: undefined,
      };
    }

    const newActivity = showActivityTypeForm
      ? { ...newActivityData, activityTypeId: undefined }
      : { ...newActivityData, activityTypeId: newActivityData.activityTypeId };

    const newActivityType = showActivityTypeForm ? newActivityTypeData : undefined;

    return { activityId: null, newActivity, newActivityType };
  };

  const getSelectedLabels = () => {
    const selectedEstablishment = (
      formData.establishments as Array<{ id: string; name?: string }>
    )?.find((e) => e.id === sessionData.establishmentId);
    const selectedProgram = (formData.programs as Array<{ id: string; name?: string }>)?.find(
      (p) => p.id === sessionData.programId,
    );
    const selectedActivity = (formData.activities as Array<{ id: string; label?: string }>)?.find(
      (a) => a.id === sessionData.activityId,
    );
    const selectedRoom = (
      formData.rooms as Array<{ id: string; name?: string; label?: string }>
    )?.find((r) => r.id === sessionData.roomId);

    return {
      establishmentName: selectedEstablishment?.name ?? null,
      programName: selectedProgram?.name ?? null,
      activityName: selectedActivity?.label ?? null,
      roomName: selectedRoom?.name || selectedRoom?.label || null,
    };
  };

  const handleSubmit = async () => {
    const isValid = validation.validateForm(sessionData);
    if (!isValid) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!validateActivityFormData()) return;

    const minCheck = validateMinParticipants(selectedTutors, selectedStudents, {
      isGroupMode,
      studentToTutor: isGroupMode ? studentToTutor : undefined,
    });
    if (!minCheck.valid) {
      toast.error(minCheck.message);
      return;
    }

    if (isGroupMode) {
      const tutorStudentsCheck = validateGroupCreateTutorsHaveStudents(
        selectedTutors,
        studentToTutor,
      );
      if (!tutorStudentsCheck.valid) {
        toast.error(tutorStudentsCheck.message);
        return;
      }
      const orphanCheck = validateOrphanStudentsForGroupMode(selectedStudents, studentToTutor);
      if (!orphanCheck.valid) {
        toast.error(orphanCheck.message);
        return;
      }
    }

    if (selectedTutors.length > 0) {
      setIsCheckingSubmit(true);
      try {
        const availabilityResult = await tutorAvailability.validateForSubmit();
        if (availabilityResult.ok === false) {
          toast.error(buildSubmitBlockedMessage(availabilityResult.unavailable));
          return;
        }
      } finally {
        setIsCheckingSubmit(false);
      }
    }

    const groupParticipants = isGroupMode
      ? buildGroupModeUpdateParticipantPayload(selectedTutors, selectedStudents, studentToTutor)
      : null;
    const tutorIds = groupParticipants?.tutorIds ?? selectedTutors.map((t) => t.id);
    const studentIds = groupParticipants?.studentIds ?? selectedStudents.map((s) => s.id);
    const volunteerIds = groupParticipants?.volunteerIds ?? [];
    const pairs = groupParticipants?.pairs ?? buildSessionPairs(tutorIds, studentIds);

    const { activityId, newActivity, newActivityType } = buildActivityData();
    const labels = getSelectedLabels();

    const dto: UpdateSessionDto = {
      establishmentId: sessionData.establishmentId,
      roomId: sessionData.roomId || null,
      programId: sessionData.programId || null,
      levelIds: sessionData.levelIds,
      subjectIds: sessionData.subjectIds,
      classId: sessionData.classId || null,
      specialtyIds: sessionData.specialtyIds.length > 0 ? sessionData.specialtyIds : null,
      sessionDate: sessionData.sessionDate,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      type: sessionData.type,
      sessionFormat: sessionData.sessionFormat,
      mode: sessionData.mode,
      recurrenceType: sessionData.recurrenceType,
      recurrenceRule: sessionData.recurrenceRule,
      activityId,
      topic: sessionData.topic || null,
      joinLink: sessionData.joinLink || null,
      planDuringHolidays: sessionData.planDuringHolidays,
      internalNotes: sessionData.internalNotes || null,
      tutorIds,
      studentIds,
      volunteerIds,
      pairs,
      newActivity,
      newActivityType,
      ...labels,
      ...(session.recurrenceGroupId && session.mode === 'recurring'
        ? { recurrenceUpdateScope }
        : {}),
    };

    updateMutation.mutate(dto);
  };

  if (sessionLoading) {
    return (
      <div className={cn('create-session-view h-full flex items-center justify-center', className)}>
        <Spinner />
      </div>
    );
  }

  if (!session) {
    return (
      <div className={cn('create-session-view h-full flex items-center justify-center', className)}>
        <p className="text-muted-foreground">Séance introuvable</p>
      </div>
    );
  }

  const formContent = (
    <>
      <div className={cn('create-session-view h-full flex flex-col gap-6', className)}>
        {/* Header avec actions */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-1-nuance-3)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border-2"
              style={{
                background: 'color-mix(in srgb, var(--color-2-nuance-1) 10%, transparent)',
                borderColor: 'var(--color-2-nuance-1)',
              }}
            >
              <Edit className="w-6 h-6" style={{ color: 'var(--color-2-nuance-1)' }} />
            </div>
            <div>
              <h2
                className="collapse-replace-form-title"
                style={{ color: 'var(--color-1-nuance-1)' }}
              >
                Modifier la séance
              </h2>
              <p className="collapse-replace-form-subtitle">
                Procédez à la modification de la séance.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            icon={X}
            onClick={onClose}
            disabled={updateMutation.isPending}
          />
        </div>

        {/* Layout restructuré : Formulaire en haut, participants en bas */}
        <div className="flex-1 min-h-0 flex flex-col gap-6">
          {/* SECTION 1: Formulaire central (pleine largeur) */}
          <div className="flex-shrink-0">
            <SessionFormCenter
              formData={sessionData}
              onChange={handleFieldChange}
              onBlur={handleBlur}
              validation={validation}
              tutors={selectedTutors}
              students={selectedStudents}
              establishments={formData.establishments}
              rooms={formData.rooms}
              levels={formData.levels}
              subjects={formData.subjects}
              programs={formData.programs}
              activities={formData.activities}
              activityTypes={activityTypesData}
              showActivityForm={showActivityForm}
              setShowActivityForm={setShowActivityForm}
              showActivityTypeForm={showActivityTypeForm}
              setShowActivityTypeForm={setShowActivityTypeForm}
              newActivityData={newActivityData}
              setNewActivityData={setNewActivityData}
              newActivityTypeData={newActivityTypeData}
              setNewActivityTypeData={setNewActivityTypeData}
              activityValidation={activityValidation}
              activityTypeValidation={activityTypeValidation}
              disablePastDate={false}
              schoolClasses={schoolClasses}
              specialtyOptions={specialtyOptions}
              isLycee={isLycee}
              selectedEstablishment={
                selectedEstablishmentDetail ??
                (session.establishment as typeof selectedEstablishmentDetail)
              }
            />
            {session.recurrenceGroupId && session.mode === 'recurring' && (
              <div
                className="mt-4 rounded-lg border p-4 space-y-3"
                style={{ borderColor: 'var(--color-1-nuance-3)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--color-1-nuance-1)' }}>
                  Portée de la modification
                </p>
                <p className="text-xs text-muted-foreground">
                  Choisissez si les changements s&apos;appliquent uniquement à cette date ou aussi
                  aux séances suivantes du même créneau récurrent.
                </p>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="recurrenceUpdateScope"
                    className="accent-[var(--color-2-nuance-1)]"
                    checked={recurrenceUpdateScope === 'occurrence'}
                    onChange={() => setRecurrenceUpdateScope('occurrence')}
                  />
                  <span>Cette séance uniquement</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="recurrenceUpdateScope"
                    className="accent-[var(--color-2-nuance-1)]"
                    checked={recurrenceUpdateScope === 'following'}
                    onChange={() => setRecurrenceUpdateScope('following')}
                  />
                  <span>Cette séance et les suivantes</span>
                </label>
              </div>
            )}
          </div>

          {/* SECTION 2: Participants (mêmes règles que la création) */}
          {!isGroupMode && (
            <SessionParticipantsSection
              selectedTutors={selectedTutors}
              selectedStudents={selectedStudents}
              selectedTutorIds={selectedTutorIds}
              selectedStudentIds={selectedStudentIds}
              maxTutors={maxTutors}
              maxStudents={maxStudents}
              onRemoveTutor={handleRemoveTutor}
              onRemoveStudent={handleRemoveStudent}
              onTutorDoubleClick={handleTutorDoubleClick}
              onStudentDoubleClick={handleStudentDoubleClick}
              establishmentId={sessionData.establishmentId || undefined}
              establishmentName={selectedEstablishmentDetail?.name}
              tutorAvailabilityById={tutorAvailability.availabilityById}
              tutorAvailabilityHint={tutorAvailability.softHint}
              tutorAvailabilityChecking={tutorAvailability.isChecking}
            />
          )}
          {isGroupMode && (
            <SessionGroupsSection
              selectedTutors={selectedTutors}
              selectedStudents={selectedStudents}
              selectedTutorIds={selectedTutorIds}
              selectedStudentIds={selectedStudentIds}
              studentToTutor={studentToTutor}
              maxTutors={maxTutors}
              maxStudents={maxStudents}
              onRemoveTutor={handleRemoveTutor}
              onRemoveStudent={handleRemoveStudent}
              onUnmatchStudent={handleUnmatchStudent}
              onTutorDoubleClick={handleTutorDoubleClick}
              onStudentDoubleClick={handleStudentDoubleClick}
              onAutoAssign={handleAutoAssign}
              autoAssignPending={proposeMutation.isPending}
              establishmentId={sessionData.establishmentId || undefined}
              establishmentName={selectedEstablishmentDetail?.name}
              tutorAvailabilityById={tutorAvailability.availabilityById}
              tutorAvailabilityHint={tutorAvailability.softHint}
              tutorAvailabilityChecking={tutorAvailability.isChecking}
            />
          )}
        </div>

        {/* Footer collé en bas avec mt-auto */}
        <div className="bg-[rgb(var(--background-rgb))] border-t border-[var(--color-1-nuance-3)] px-6 py-4 flex items-center justify-end gap-3">
          <Button variant="outline" size="md" onClick={onClose} disabled={updateMutation.isPending}>
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={updateMutation.isPending || isCheckingSubmit}
            disabled={!validation.isFormValid() || updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>

      <AutoAssignmentProposalModal
        open={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        onApply={handleApplyProposal}
        proposal={autoProposal}
        tutors={selectedTutors}
        students={selectedStudents}
        isLoading={proposeMutation.isPending}
      />
    </>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={isGroupMode ? collisionDetection : closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {formContent}
      <CustomDragOverlay activeUser={activeDragUser} />

      <SlidePanel isOpen={isTutorPanelOpen} onClose={() => setIsTutorPanelOpen(false)}>
        <CreateTutorView
          onClose={() => setIsTutorPanelOpen(false)}
          onSuccess={() => {
            setIsTutorPanelOpen(false);
            queryClient.invalidateQueries({ queryKey: ['tutors'] });
          }}
        />
      </SlidePanel>

      <SlidePanel isOpen={isStudentPanelOpen} onClose={() => setIsStudentPanelOpen(false)}>
        <CreateStudentView
          onClose={() => setIsStudentPanelOpen(false)}
          onSuccess={() => {
            setIsStudentPanelOpen(false);
            queryClient.invalidateQueries({ queryKey: ['students'] });
          }}
        />
      </SlidePanel>
    </DndContext>
  );
};
