import * as React from 'react';
import { FC } from 'react';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import { SessionFormCenter, COLLECTIVE_SESSION_TYPE_VALUES } from './SessionFormCenter';
import { SessionParticipantsSection } from './SessionParticipantsSection';
import { SessionGroupsSection } from './SessionGroupsSection';
import { CustomDragOverlay } from './CustomDragOverlay';
import { AutoAssignmentProposalModal } from './AutoAssignmentProposalModal';
import {
  buildSessionPairs,
  buildGroupModeSessionDtos,
  facilitatorRoleForSession,
  validateGroupCreateTutorsHaveStudents,
  validateGroupSessionDtos,
  validateMinParticipants,
  validateOrphanStudentsForGroupMode,
} from './session-participant-rules';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { Button } from '@/components/forms/Button';
import { X, Save, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionFormData } from '@/hooks/useSessionFormData';
import { useSessionTutorAvailability } from '@/hooks/useSessionTutorAvailability';
import {
  buildSubmitBlockedMessage,
  ensureTutorAvailableForAdd,
} from '@/components/sessions/session-tutor-availability';
import {
  checkRoomCapacity,
  createSessionsBulk,
  type RoomCapacityResult,
} from '@/services/sessions.service';
import { proposeDraftAutoAssignment } from '@/services/matching.service';
import type { AutoAssignmentProposal } from '@/types/matching.types';
import type {
  SessionType,
  SessionFormat,
  SessionMode,
  RecurrenceType,
  CreateSessionDto,
  CreateActivityDto,
  CreateActivityTypeDto,
  PlanificationType,
} from '@/types/session.types';
import { isGroupSessionType } from '@/types/session.types';
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

interface CreateSessionViewProps {
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
  showParticipants?: boolean;
  /** Filtre les options de "Type de séance" selon le type de planification choisi en amont. */
  planificationType?: PlanificationType;
}

/** Erreur "métier" levée par la mutation quand la salle ne peut pas accueillir les participants. */
class RoomCapacityExceededError extends Error {
  constructor(public readonly result: RoomCapacityResult) {
    super(result.message ?? 'Capacité de la salle dépassée');
    this.name = 'RoomCapacityExceededError';
  }
}

export const CreateSessionView: FC<CreateSessionViewProps> = ({
  onClose,
  onSuccess,
  className,
  showParticipants = true,
  planificationType,
}) => {
  // Form state
  const [sessionData, setSessionData] = React.useState<{
    establishmentId: string;
    schoolYearId: string;
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
    type: SessionType | '';
    sessionFormat: SessionFormat | '';
    mode: SessionMode | '';
    recurrenceType: RecurrenceType;
    recurrenceRule: Record<string, unknown> | null;
    topic: string;
    joinLink: string;
    planDuringHolidays: boolean;
    internalNotes: string;
  }>({
    establishmentId: '',
    schoolYearId: '',
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
    // En planification individuelle, le seul type valide est `individual_tutoring`, donc on pré-remplit.
    type: planificationType === 'individual' ? 'individual_tutoring' : '',
    sessionFormat: '',
    mode: '',
    recurrenceType: 'none',
    recurrenceRule: null,
    topic: '',
    joinLink: '',
    planDuringHolidays: true,
    internalNotes: '',
  });

  const [selectedTutors, setSelectedTutors] = React.useState<UserWithProfile[]>([]);
  const [selectedStudents, setSelectedStudents] = React.useState<UserWithProfile[]>([]);
  /** Mapping élève → tuteur pour le mode groupes (aide aux devoirs, atelier, tutorat). */
  const [studentToTutor, setStudentToTutor] = React.useState<Record<string, string>>({});

  // Suggestion d'affectation auto (modale d'aperçu, pas encore persistée).
  const [proposalModalOpen, setProposalModalOpen] = React.useState(false);
  const [autoProposal, setAutoProposal] = React.useState<AutoAssignmentProposal | null>(null);

  // Mode "groupes" activé pour les types de séances qui supportent plusieurs binômes.
  const isGroupMode = isGroupSessionType(sessionData.type);

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
    enabled: showParticipants,
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

  // Aligner la validation sur le state initial : les champs obligatoires pré-remplis sans `handleFieldChange`
  // (ex. type `individual_tutoring` avec select désactivé en planification individuelle) resteraient `isValid: false`
  // et bloqueraient le bouton « Créer » tant que `isFormValid()` ne les aurait pas recalculés.
  React.useEffect(() => {
    validation.validateInitialFormData(sessionData);
    // Intentionnellement uniquement au montage : ne pas ré-exécuter à chaque modification du formulaire.
  }, []);

  // Si l'utilisateur rouvre la modale de planification sans fermer le formulaire, `planificationType`
  // change alors que le state local garde un `type` hors des options filtrées → Select Radix sans libellé ni placeholder.
  React.useEffect(() => {
    if (planificationType === 'individual') {
      setSessionData((prev) =>
        prev.type === 'individual_tutoring' ? prev : { ...prev, type: 'individual_tutoring' },
      );
    } else if (planificationType === 'collective') {
      setSessionData((prev) => {
        const t = prev.type as SessionType | '';
        if (!t || COLLECTIVE_SESSION_TYPE_VALUES.includes(t)) return prev;
        return { ...prev, type: '' };
      });
    }
  }, [planificationType]);

  React.useEffect(() => {
    if (planificationType !== 'individual' && planificationType !== 'collective') return;
    validation.validateField('type', sessionData.type, sessionData);
  }, [planificationType, sessionData.type]);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Alerte de capacité de salle dépassée (renseignée quand le check renvoie available: false).
  const [capacityAlert, setCapacityAlert] = React.useState<RoomCapacityResult | null>(null);

  // Mutation pour créer une ou plusieurs séances en une seule passe.
  // 1) Vérifie la capacité de la salle via /sessions/check-room-capacity
  //    (somme des participants de toutes les séances, qui partagent salle/date/horaires)
  // 2) Crée la/les séance(s) via /sessions/bulk
  // En mode groupes (homework_help / workshop) on envoie 1 séance par tuteur avec pairs élève↔tuteur.
  // Le backend persiste session_student_tutor_pairs à la création (même logique que PUT /assignments).
  const createMutation = useMutation({
    mutationFn: async (input: { dtos: CreateSessionDto[] }) => {
      const { dtos } = input;
      const first = dtos[0];

      // 1) Vérification globale de la capacité de la salle.
      const participantsToAdd = dtos.reduce(
        (sum, d) =>
          sum +
          (d.tutorIds?.length ?? 0) +
          (d.studentIds?.length ?? 0) +
          (d.volunteerIds?.length ?? 0),
        0,
      );

      if (
        first?.roomId &&
        first.sessionDate &&
        first.startTime &&
        first.endTime &&
        participantsToAdd > 0
      ) {
        const capacity = await checkRoomCapacity({
          roomId: first.roomId,
          participantsToAdd,
          sessionDate: first.sessionDate,
          startTime: first.startTime,
          endTime: first.endTime,
        });
        if (!capacity.available) {
          throw new RoomCapacityExceededError(capacity);
        }
      }

      // 2) Création en masse (le backend gère la récurrence côté serveur pour chaque item).
      return createSessionsBulk(dtos);
    },
    onSuccess: (bulk) => {
      const { created, failed, total } = bulk.summary;
      if (failed > 0) {
        const firstError = bulk.results.find((r) => r.status === 'error')?.error;
        toast.error(firstError || 'Erreur lors de la création des séances');
        return;
      }
      toast.success(
        total === 1 ? 'Séance créée avec succès !' : `${created} séance(s) créée(s) avec succès !`,
      );
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof RoomCapacityExceededError) {
        setCapacityAlert(error.result);
        return;
      }
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la création des séances');
    },
  });

  // Capacités max selon type de séance et activité
  const selectedActivity = formData.activities.find((a) => a.id === sessionData.activityId);

  const getMaxTutors = (): number | null => {
    // En planification individuelle, on force un unique tuteur, peu importe la config de l'activité.
    if (planificationType === 'individual') return 1;
    return selectedActivity?.maxTutors ?? null;
  };

  const getMaxStudents = React.useCallback((): number | null => {
    return selectedActivity?.maxStudents ?? null;
  }, [selectedActivity]);

  const maxTutors = getMaxTutors();
  const maxStudents = getMaxStudents();

  const tutorLimitMessage = React.useCallback(
    (incomingName?: string): string => {
      if (planificationType === 'individual') {
        return incomingName
          ? `Planification individuelle : un seul tuteur autorisé. Retirez le tuteur actuel avant d'ajouter ${incomingName}.`
          : 'Planification individuelle : un seul tuteur est autorisé. Retirez le tuteur actuel pour en ajouter un autre.';
      }
      return `Capacité maximale atteinte (${maxTutors} tuteur(s))`;
    },
    [planificationType, maxTutors],
  );

  // Gestion du changement de type de séance (sans selectedStudents dans les dépendances pour éviter les boucles)
  React.useEffect(() => {
    setSelectedStudents((current) => {
      const newMaxStudents = getMaxStudents();
      if (newMaxStudents !== null && current.length > newMaxStudents) {
        const keptStudents = current.slice(0, newMaxStudents);
        const removedCount = current.length - newMaxStudents;
        toast.warning(
          `Type de séance modifié : ${removedCount} élève(s) retiré(s) (capacité max: ${newMaxStudents})`,
        );
        return keptStudents;
      }
      return current;
    });
  }, [sessionData.type, sessionData.activityId, getMaxStudents]);

  // Changement de type de séance (ex. Atelier → Classe entière) : les participants ne sont plus pertinents.
  const prevSessionTypeForParticipantsRef = React.useRef<SessionType | '' | null>(null);
  React.useEffect(() => {
    const prev = prevSessionTypeForParticipantsRef.current;
    if (prev !== null && prev !== sessionData.type) {
      setSelectedTutors([]);
      setSelectedStudents([]);
      setStudentToTutor({});
    }
    prevSessionTypeForParticipantsRef.current = sessionData.type;
  }, [sessionData.type]);

  // Reset recurrenceRule when recurrenceType changes
  React.useEffect(() => {
    setSessionData((prev) => ({ ...prev, recurrenceRule: null }));
  }, [sessionData.recurrenceType]);

  // Handlers
  const handleFieldChange = (
    field: string,
    value: string | string[] | boolean | Record<string, unknown> | null,
  ) => {
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
    const activeType = active.data.current?.type as string | undefined;
    const isTutorDrag =
      roleGroup === 'tutors' ||
      roleGroup === 'volunteers' ||
      activeType === 'tutor' ||
      activeType === 'volunteer';
    // Ne pas activer l'overlay si un tuteur/volunteer est déplacé sans date ou créneau sélectionné
    if (
      isTutorDrag &&
      (!sessionData.sessionDate || !sessionData.startTime || !sessionData.endTime)
    ) {
      return;
    }
    if (userData) {
      setActiveDragUser(userData);
    }
  };

  const addTutorToSession = (userData: UserWithProfile) => {
    if (!userData.id) {
      toast.error('Impossible d\u2019ajouter le tuteur : identifiant manquant après la création.');
      return;
    }

    if (maxTutors !== null && selectedTutors.length >= maxTutors) {
      toast.warning(tutorLimitMessage(`${userData.firstName} ${userData.lastName}`));
      return;
    }

    if (selectedTutors.some((t) => t.id === userData.id)) {
      toast.info(`${userData.firstName} ${userData.lastName} est déjà ajouté(e) comme tuteur.`);
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
      toast.error(`Capacité maximale atteinte (${maxStudents} élève(s))`);
      return;
    }

    if (selectedStudents.some((s) => s.id === userData.id)) {
      toast.info(`${userData.firstName} ${userData.lastName} est déjà ajouté(e) comme élève.`);
      return;
    }

    const userWithRole = {
      ...userData,
      currentRole: 'student' as const,
    };
    setSelectedStudents((prev) => [...prev, userWithRole]);
    toast.success(`${userData.firstName} ${userData.lastName} ajouté(e) comme élève`);
  };

  /** Vérifie la dispo du tuteur sur le créneau (helper partagé entre les modes). */
  const ensureTutorAvailable = React.useCallback(
    async (userData: UserWithProfile): Promise<boolean> =>
      ensureTutorAvailableForAdd({
        user: userData,
        slot: sessionSlot,
        selectedTutors,
        maxTutors,
        tutorLimitMessage,
        toast,
      }),
    [sessionSlot, selectedTutors, maxTutors, tutorLimitMessage],
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragUser(null);

    if (!over) return;

    const userData = active.data.current?.user as UserWithProfile;
    // Supporte les 2 formats de data :
    //   - DraggableUserCard (colonnes) → { roleGroup: 'tutors'|'volunteers'|'students', user }
    //   - RemovableParticipantChip (chips déjà placés) → { type: 'tutor'|'volunteer'|'student', user }
    const roleGroup = active.data.current?.roleGroup as string | undefined;
    const activeType = active.data.current?.type as string | undefined;
    const isTutorDrag =
      roleGroup === 'tutors' ||
      roleGroup === 'volunteers' ||
      activeType === 'tutor' ||
      activeType === 'volunteer';
    const isStudentDrag = roleGroup === 'students' || activeType === 'student';

    const dropZoneId = over.id as string;
    const overType = over.data.current?.type as string | undefined;

    // ── MODE GROUPES (homework_help / workshop) ──────────────────────────────
    // On réutilise les patterns de la page Matching : UnifiedDropZone(mode="matching")
    // - Drop sur "matching-dropzone-unified-${NEW_SESSION_DROP_ID}" : ajoute un participant.
    // - Drop sur "tutor-chip-${tutorId}-${NEW_SESSION_DROP_ID}" : matching élève↔tuteur.
    if (isGroupMode) {
      // 1) Drop d'un élève sur un chip tuteur → matching élève↔tuteur.
      if (isStudentDrag && overType === 'tutor-chip') {
        const tutorId = over.data.current?.tutorId as string | undefined;
        if (!tutorId) return;
        matchStudentToTutor(userData, tutorId);
        return;
      }

      // 2) Drop d'un tuteur dans la dropzone unifiée → ajout d'un tuteur (= nouveau groupe).
      if (isTutorDrag && overType === 'matching-dropzone-unified') {
        const ok = await ensureTutorAvailable(userData);
        if (!ok) return;
        addTutorToSession(userData);
        return;
      }

      // 3) Drop d'un élève dans la dropzone unifiée (pas sur un tuteur) → ajout comme orphelin.
      //    Toast d'avertissement pour rappeler qu'il faut l'assigner à un tuteur.
      if (isStudentDrag && overType === 'matching-dropzone-unified') {
        addStudentToSession(userData);
        if (selectedTutors.length > 0) {
          toast.warning('Glissez l\u2019élève sous un tuteur pour l\u2019assigner à un groupe.');
        }
        return;
      }

      return;
    }

    // ── MODE CLASSIQUE (planification individuelle, classe entière, etc.) ──
    if (dropZoneId !== 'unified-participants-drop') return;

    if (roleGroup === 'tutors' || roleGroup === 'volunteers') {
      const ok = await ensureTutorAvailable(userData);
      if (!ok) return;
      addTutorToSession(userData);
    } else if (roleGroup === 'students') {
      addStudentToSession(userData);
    }
  };

  const handleRemoveTutor = (userId: string) => {
    setSelectedTutors((prev) => prev.filter((t) => t.id !== userId));
    // En mode groupes, retirer un tuteur libère tous ses élèves (qui deviennent orphelins).
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

  /** Assigne un élève à un tuteur (mode groupes). Ajoute l'élève à la session si nécessaire. */
  const matchStudentToTutor = React.useCallback((student: UserWithProfile, tutorId: string) => {
    setSelectedStudents((prev) =>
      prev.some((s) => s.id === student.id)
        ? prev
        : [...prev, { ...student, currentRole: 'student' as const }],
    );
    setStudentToTutor((prev) => ({ ...prev, [student.id]: tutorId }));
  }, []);

  /** Retire l'assignation élève↔tuteur (l'élève reste participant mais devient orphelin). */
  const handleUnmatchStudent = React.useCallback((studentId: string, tutorId: string) => {
    setStudentToTutor((prev) => {
      if (prev[studentId] !== tutorId) return prev;
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  }, []);

  /**
   * Mutation : appel à l'endpoint propose-draft. Renvoie une suggestion non persistée
   * que l'on affiche dans une modale. L'utilisateur confirme pour l'appliquer.
   */
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

  /**
   * Demande au backend une suggestion d'affectation auto pour la séance en cours
   * de création (aucune écriture côté serveur). Ouvre ensuite la modale d'aperçu.
   */
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
    const sessionType = sessionData.type as SessionType | '';
    if (
      !sessionType ||
      (!isGroupSessionType(sessionType) &&
        sessionType !== 'individual_tutoring' &&
        sessionType !== 'whole_class')
    ) {
      toast.warning('Sélectionnez d\u2019abord un type de séance.');
      return;
    }

    const participants = [
      ...selectedTutors.map((t) => ({
        userId: t.id,
        role: facilitatorRoleForSession(t),
      })),
      ...selectedStudents.map((s) => ({ userId: s.id, role: 'student' as const })),
    ];

    proposeMutation.mutate({
      sessionType,
      establishmentId: sessionData.establishmentId,
      subjectId: sessionData.subjectIds?.[0] ?? null,
      activityId: sessionData.activityId || null,
      participants,
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

  /** Applique localement les binômes suggérés (rien n'est persisté tant que "Créer" n'est pas cliqué). */
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
    [selectedStudents],
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

  const validateActivityForms = (): boolean => {
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

    if (showActivityTypeForm) {
      return {
        activityId: null,
        newActivity: {
          ...newActivityData,
          activityTypeId: undefined,
        } as CreateActivityDto,
        newActivityType: newActivityTypeData as CreateActivityTypeDto,
      };
    }

    return {
      activityId: null,
      newActivity: {
        ...newActivityData,
        activityTypeId: newActivityData.activityTypeId,
      },
      newActivityType: undefined,
    };
  };

  const getSelectedEntities = () => ({
    establishment: (formData.establishments as Array<{ id: string; name?: string }>)?.find(
      (e) => e.id === sessionData.establishmentId,
    ),
    program: (formData.programs as Array<{ id: string; name?: string }>)?.find(
      (p) => p.id === sessionData.programId,
    ),
    activity: (formData.activities as Array<{ id: string; label?: string }>)?.find(
      (a) => a.id === sessionData.activityId,
    ),
    room: (formData.rooms as Array<{ id: string; name?: string; label?: string }>)?.find(
      (r) => r.id === sessionData.roomId,
    ),
  });

  const handleSubmit = async () => {
    const isValid = validation.validateForm(sessionData);
    if (!isValid) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!validateActivityForms()) return;

    if (showParticipants) {
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
    }

    const { activityId, newActivity, newActivityType } = buildActivityData();
    const selected = getSelectedEntities();

    // Champs communs à toutes les séances créées (mêmes salle / date / horaires / activité…).
    const baseDto: Omit<CreateSessionDto, 'tutorIds' | 'studentIds' | 'volunteerIds' | 'pairs'> = {
      establishmentId: sessionData.establishmentId,
      schoolYearId: sessionData.schoolYearId || null,
      roomId: sessionData.roomId || null,
      programId: sessionData.programId || null,
      levelIds: sessionData.levelIds,
      subjectIds: sessionData.subjectIds,
      classId: sessionData.classId || null,
      specialtyIds: sessionData.specialtyIds.length > 0 ? sessionData.specialtyIds : null,
      sessionDate: sessionData.sessionDate,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      type: sessionData.type as SessionType,
      sessionFormat: sessionData.sessionFormat || undefined,
      mode: sessionData.mode || undefined,
      recurrenceType: sessionData.recurrenceType,
      recurrenceRule: sessionData.recurrenceRule,
      activityId,
      establishmentName: selected.establishment?.name ?? null,
      programName: selected.program?.name ?? null,
      activityName: selected.activity?.label ?? null,
      roomName: selected.room?.name || selected.room?.label || null,
      topic: sessionData.topic || null,
      joinLink: sessionData.joinLink || null,
      planDuringHolidays: sessionData.planDuringHolidays,
      internalNotes: sessionData.internalNotes || null,
      newActivity,
      newActivityType,
    };

    let dtos: CreateSessionDto[];

    if (isGroupMode) {
      // Mode groupes : 1 séance par tuteur avec élèves ; VSC sans élève → participant (volunteer) sur les autres séances.
      dtos = buildGroupModeSessionDtos(selectedTutors, studentToTutor, baseDto);
    } else {
      // Mode classique (individual_tutoring / whole_class) : 1 seule séance avec tous les participants.
      const tutorIds = selectedTutors.map((t) => t.id);
      const studentIds = selectedStudents.map((s) => s.id);
      dtos = [
        {
          ...baseDto,
          tutorIds,
          studentIds,
          volunteerIds: [],
          pairs: buildSessionPairs(tutorIds, studentIds),
        },
      ];
    }

    if (isGroupMode) {
      if (dtos.length < 1) {
        toast.error(
          'Ajoutez au moins un tuteur avec des élèves pour créer une séance. Un VSC sans élève sera ajouté comme participant sur les autres groupes.',
        );
        return;
      }
      const dtoCheck = validateGroupSessionDtos(selectedTutors, studentToTutor, dtos);
      if (!dtoCheck.valid) {
        toast.error(dtoCheck.message);
        return;
      }
    }

    createMutation.mutate({ dtos });
  };

  const isCreateDisabled =
    createMutation.isPending || !validation.isFormValid() || sessionData.subjectIds.length === 0;

  // Collision detection : on priorise toujours les chips tuteurs (drop élève → matching)
  // sur la UnifiedDropZone parent. Sinon `pointerWithin` puis `closestCenter` en fallback.
  const collisionDetection: CollisionDetection = React.useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      // S'il y a un tutor-chip parmi les collisions, on le retourne en priorité.
      const tutorChipCollision = pointerCollisions.find(
        (c) => c.data?.droppableContainer?.data?.current?.type === 'tutor-chip',
      );
      if (tutorChipCollision) return [tutorChipCollision];
      return pointerCollisions;
    }
    return closestCenter(args);
  }, []);

  const formContent = (
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
            <Plus className="w-6 h-6" style={{ color: 'var(--color-2-nuance-1)' }} />
          </div>
          <div>
            <h2
              className="collapse-replace-form-title"
              style={{ color: 'var(--color-1-nuance-1)' }}
            >
              Planification des séances
            </h2>
            <p className="collapse-replace-form-subtitle">
              Procédez à la création d'une nouvelle séance.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          icon={X}
          onClick={onClose}
          disabled={createMutation.isPending}
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
            schoolClasses={schoolClasses}
            specialtyOptions={specialtyOptions}
            isLycee={isLycee}
            planificationType={planificationType}
          />
        </div>

        {/* SECTION 2: Participants (3 colonnes en dessous) */}
        {showParticipants && !isGroupMode && (
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
        {showParticipants && isGroupMode && (
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
        <Button variant="outline" size="md" onClick={onClose} disabled={createMutation.isPending}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          loading={createMutation.isPending || isCheckingSubmit}
          disabled={isCreateDisabled}
        >
          <Save className="w-4 h-4 mr-2" />
          Créer
        </Button>
      </div>

      {/* Modale d'aperçu de la suggestion d'affectation auto (mode groupes). */}
      <AutoAssignmentProposalModal
        open={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        onApply={handleApplyProposal}
        proposal={autoProposal}
        tutors={selectedTutors}
        students={selectedStudents}
        isLoading={proposeMutation.isPending}
      />

      {/* Alerte : capacité de la salle dépassée pour le créneau choisi. */}
      {capacityAlert && (
        <ConfirmModal
          open={!!capacityAlert}
          onClose={() => setCapacityAlert(null)}
          onConfirm={() => setCapacityAlert(null)}
          title="Capacité de la salle dépassée"
          description={
            capacityAlert.message ??
            `La salle "${capacityAlert.roomName}" ne peut pas accueillir ${capacityAlert.participantsToAdd} participant(s) supplémentaire(s). ` +
              `Capacité maximale : ${capacityAlert.capacity ?? 'non renseignée'}, ` +
              `participants déjà présents sur ce créneau : ${capacityAlert.currentParticipants}, ` +
              `total demandé : ${capacityAlert.totalIfAdded}.`
          }
          confirmText="J'ai compris"
          cancelText="Fermer"
          variant="warning"
        />
      )}
    </div>
  );

  if (!showParticipants) {
    return formContent;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {formContent}
      <CustomDragOverlay activeUser={activeDragUser} />
    </DndContext>
  );
};
