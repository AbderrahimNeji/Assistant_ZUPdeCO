import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Save,
  GraduationCap,
  User,
  Building2,
  Workflow,
  Repeat2,
} from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UnifiedDropZone } from '@/components/matching/UnifiedDropZone';
import { LabelBadge } from '@/components/common/LabelBadge';
import { AutoAssignmentModal } from '@/components/matching/AutoAssignmentModal';
import {
  SESSION_TYPE_CONFIG,
  SESSION_RECURRENCE_LABELS,
} from '@/components/sessions/session-configs';
import { setSessionAssignments, runSessionAutoAssignment } from '@/services/matching.service';
import { toast } from '@/lib/toast';
import type { SessionForMatching } from '@/types/matching-ui.types';
import type { UserWithProfile } from '@/types/user.types';

interface SessionMatchingCollapseProps {
  session: SessionForMatching;
  isExpanded: boolean;
  onToggle: () => void;
  onRegisterHandlers?: (
    sessionId: string,
    handlers: {
      handleAddTutor: (user: UserWithProfile) => void;
      handleAddStudent: (user: UserWithProfile) => void;
      handleMatchStudentToTutor: (studentId: string, tutorId: string) => void;
      handleUnmatchStudent: (studentId: string, tutorId: string) => void;
      getSpecificMatches: () => Array<{ studentId: string; tutorId: string }>;
      getTempTutors: () => UserWithProfile[];
      getTempStudents: () => UserWithProfile[];
    },
  ) => void;
  onParticipantsChange?: () => void;
}

// Interface pour tracker les matchings élève→tuteur
interface StudentTutorMatch {
  studentId: string;
  tutorId: string;
  assignmentSource?: 'manual' | 'auto_binome_coeur' | 'auto_history' | 'auto_balanced';
}

export const SessionMatchingCollapse: React.FC<SessionMatchingCollapseProps> = ({
  session,
  isExpanded,
  onToggle,
  onRegisterHandlers,
  onParticipantsChange,
}) => {
  const queryClient = useQueryClient();

  // État local pour les participants temporaires
  const [tempTutors, setTempTutors] = React.useState<UserWithProfile[]>([]);
  const [tempStudents, setTempStudents] = React.useState<UserWithProfile[]>([]);

  // État pour les matchings spécifiques élève→tuteur
  const [specificMatches, setSpecificMatches] = React.useState<StudentTutorMatch[]>([]);

  // État pour la modal d'auto-affectation
  const [showAutoAssignModal, setShowAutoAssignModal] = React.useState(false);

  // Calculer maxStudents basé sur le type de session
  const maxStudents = React.useMemo(() => {
    return session.activity?.maxStudents ?? session.maxStudents ?? null;
  }, [session.activity?.maxStudents, session.maxStudents]);

  // Calculer si capacité dépassée
  const studentsOverCapacity = React.useMemo(() => {
    if (maxStudents === null) return 0;
    return Math.max(0, tempStudents.length - maxStudents);
  }, [tempStudents.length, maxStudents]);

  // Charger les participants existants de la séance
  React.useEffect(() => {
    if (session.participants) {
      const tutors = session.participants
        .filter((p) => p.role === 'tutor' || p.role === 'volunteer')
        .map((p) => p.user!)
        .filter(Boolean);
      const students = session.participants
        .filter((p) => p.role === 'student')
        .map((p) => p.user!)
        .filter(Boolean);

      setTempTutors(tutors);
      setTempStudents(students);
    }

    // Charger les matchings existants depuis session.studentTutorPairs
    if (session.studentTutorPairs) {
      const matches = session.studentTutorPairs.map((pair) => ({
        studentId: pair.studentUserId,
        tutorId: pair.tutorUserId,
        assignmentSource: pair.assignmentSource,
      }));
      setSpecificMatches(matches);
    }
  }, [session.participants, session.studentTutorPairs]);

  // Mutation pour valider les affectations
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Si on a des matchings spécifiques, on les utilise
      // Sinon, matching par défaut : tous les élèves avec tous les tuteurs
      const pairs =
        specificMatches.length > 0
          ? specificMatches.map((match) => ({
              studentUserId: match.studentId,
              tutorUserId: match.tutorId,
            }))
          : tempStudents.flatMap((student) =>
              tempTutors.map((tutor) => ({
                studentUserId: student.id,
                tutorUserId: tutor.id,
              })),
            );

      // Construire la liste des participants explicites
      const participants = [
        ...tempTutors.map((tutor) => ({
          userId: tutor.id,
          role: (tutor.currentRole || 'tutor') as 'tutor' | 'volunteer',
        })),
        ...tempStudents.map((student) => ({
          userId: student.id,
          role: 'student' as const,
        })),
      ];

      return setSessionAssignments(session.id, { pairs, participants });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['matching-pairs'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-candidates', session.id] });
      toast.success('Affectations enregistrées avec succès !');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erreur lors de l'enregistrement");
    },
  });

  // Mutation pour auto-affectation
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      // Construire la liste des participants explicites
      const participants = [
        ...tempTutors.map((tutor) => ({
          userId: tutor.id,
          role: (tutor.currentRole || 'tutor') as 'tutor' | 'volunteer',
        })),
        ...tempStudents.map((student) => ({
          userId: student.id,
          role: 'student' as const,
        })),
      ];

      return runSessionAutoAssignment(session.id, participants);
    },
    onSuccess: (pairs) => {
      // Charger les nouvelles binômes dans l'état local
      const newMatches = pairs.map((p) => ({
        studentId: p.studentUserId,
        tutorId: p.tutorUserId,
      }));
      setSpecificMatches(newMatches);

      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['matching-pairs'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-candidates', session.id] });
      toast.success(`Auto-affectation réussie ! ${pairs.length} matchings créés.`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Erreur lors de l'auto-affectation");
    },
  });

  const { dateLabel, timeLabel, establishmentDisplay, recurrenceLabel } = React.useMemo(() => {
    let dateLabel = '—';
    try {
      const raw = session.sessionDate;
      const d =
        typeof raw === 'string' ? new Date(raw) : raw instanceof Date ? raw : new Date(String(raw));
      if (!isNaN(d.getTime())) {
        dateLabel = format(d, 'EEEE d MMMM yyyy', { locale: fr });
      }
    } catch {
      /* keep — */
    }

    const ft = (time: string | null | undefined) => (time ? time.slice(0, 5) : '--:--');
    const timeLabel = `${ft(session.startTime)} – ${ft(session.endTime)}`;

    const establishmentDisplay =
      (session.establishmentName ?? session.establishment?.name)?.trim() || null;

    const rec = session.recurrenceType;
    const recurrenceLabel =
      rec && rec !== 'none' ? (SESSION_RECURRENCE_LABELS[rec] ?? rec.replace(/_/g, ' ')) : null;

    return { dateLabel, timeLabel, establishmentDisplay, recurrenceLabel };
  }, [
    session.sessionDate,
    session.startTime,
    session.endTime,
    session.establishmentName,
    session.establishment?.name,
    session.recurrenceType,
  ]);

  // Handlers pour ajouter/retirer des participants (useCallback pour stabilité)
  const handleAddTutor = React.useCallback(
    (user: UserWithProfile) => {
      setTempTutors((prev) => {
        if (prev.some((t) => t.id === user.id)) return prev;
        // Vérifier capacité max (warning visuel dans UnifiedDropZone)
        const maxTutors = session.activity?.maxStudentsPerTutor;
        if (maxTutors !== undefined && maxTutors !== null && prev.length >= maxTutors) {
          return prev;
        }
        return [...prev, user];
      });
      // Appeler APRÈS le setState pour garantir l'exécution
      setTimeout(() => onParticipantsChange?.(), 0);
    },
    [onParticipantsChange, session.activity?.maxStudentsPerTutor],
  );

  const handleAddStudent = React.useCallback(
    (user: UserWithProfile) => {
      setTempStudents((prev) => {
        if (prev.some((s) => s.id === user.id)) return prev;
        // Vérifier capacité max (warning visuel dans UnifiedDropZone)
        if (maxStudents !== null && prev.length >= maxStudents) {
          return prev;
        }
        return [...prev, user];
      });
      // Appeler APRÈS le setState pour garantir l'exécution
      setTimeout(() => onParticipantsChange?.(), 0);
    },
    [onParticipantsChange, maxStudents],
  );

  const handleRemoveTutor = React.useCallback(
    (userId: string) => {
      setTempTutors((prev) => prev.filter((t) => t.id !== userId));
      setSpecificMatches((prev) => prev.filter((m) => m.tutorId !== userId));
      // Appeler APRÈS le setState pour garantir l'exécution
      setTimeout(() => onParticipantsChange?.(), 0);
    },
    [onParticipantsChange],
  );

  const handleRemoveStudent = React.useCallback(
    (userId: string) => {
      setTempStudents((prev) => prev.filter((s) => s.id !== userId));
      setSpecificMatches((prev) => prev.filter((m) => m.studentId !== userId));
      // Appeler APRÈS le setState pour garantir l'exécution
      setTimeout(() => onParticipantsChange?.(), 0);
    },
    [onParticipantsChange],
  );

  // Handler pour créer un matching spécifique élève→tuteur (useCallback pour stabilité)
  const handleMatchStudentToTutor = React.useCallback((studentId: string, tutorId: string) => {
    setSpecificMatches((prev) => {
      const existingMatch = prev.find((m) => m.studentId === studentId && m.tutorId === tutorId);
      if (existingMatch) return prev;
      return [...prev, { studentId, tutorId }];
    });
  }, []);

  // Handler pour retirer un matching spécifique (useCallback pour stabilité)
  const handleUnmatchStudent = React.useCallback((studentId: string, tutorId: string) => {
    setSpecificMatches((prev) =>
      prev.filter((m) => !(m.studentId === studentId && m.tutorId === tutorId)),
    );
  }, []);

  // Calculer les élèves matchés pour chaque tuteur avec leur source (useCallback pour stabilité)
  const getTutorMatchedStudents = React.useCallback(
    (tutorId: string): Array<UserWithProfile & { assignmentSource?: string }> => {
      const matchesForTutor = specificMatches.filter((m) => m.tutorId === tutorId);

      return matchesForTutor
        .map((match) => {
          const student = tempStudents.find((s) => s.id === match.studentId);
          return student ? { ...student, assignmentSource: match.assignmentSource } : null;
        })
        .filter(Boolean) as Array<UserWithProfile & { assignmentSource?: string }>;
    },
    [specificMatches, tempStudents],
  );

  // Getter pour les matchings (utilisé par ConfigureMatchingView)
  const getSpecificMatches = React.useCallback(() => specificMatches, [specificMatches]);

  // Getters pour les états locaux (utilisés pour excludedIds)
  const getTempTutors = React.useCallback(() => tempTutors, [tempTutors]);
  const getTempStudents = React.useCallback(() => tempStudents, [tempStudents]);

  // Enregistrer les handlers pour ConfigureMatchingView
  React.useEffect(() => {
    if (onRegisterHandlers) {
      onRegisterHandlers(session.id, {
        handleAddTutor,
        handleAddStudent,
        handleMatchStudentToTutor,
        handleUnmatchStudent,
        getSpecificMatches,
        getTempTutors,
        getTempStudents,
      });
    }
  }, [
    session.id,
    onRegisterHandlers,
    handleAddTutor,
    handleAddStudent,
    handleMatchStudentToTutor,
    handleUnmatchStudent,
    getSpecificMatches,
    getTempTutors,
    getTempStudents,
  ]);

  return (
    <div className="matching-session-collapse">
      {/* Header - Cliquable */}
      <div onClick={onToggle} className="matching-session-collapse-header">
        <div className="flex items-center gap-3 flex-1">
          <div className="matching-session-collapse-chevron">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex min-w-0 flex-1 basis-0 flex-col justify-center gap-0.5">
              <p className="font-medium text-base" style={{ color: 'var(--color-1-nuance-1)' }}>
                {dateLabel}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">{timeLabel}</p>
            </div>
            <div className="flex min-w-0 flex-1 basis-0 items-center justify-start">
              {(() => {
                const typeConfig = SESSION_TYPE_CONFIG[session.type];
                const TypeIcon = typeConfig?.icon;
                return (
                  <LabelBadge
                    label={typeConfig?.label ?? session.type}
                    icon={TypeIcon}
                    variant={typeConfig?.badgeVariant ?? 'ghost'}
                    color={typeConfig?.badgeColor ?? 'var(--color-2-nuance-1)'}
                    size="sm"
                  />
                );
              })()}
            </div>
            <div className="flex min-w-0 flex-1 basis-0 items-center gap-2">
              <Building2
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--color-1-nuance-1)' }}
              />
              <span className="min-w-0 truncate text-sm text-foreground">
                {establishmentDisplay || 'Non défini'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div
                className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)] text-[var(--color-2-nuance-1)] border border-[var(--color-2-nuance-1)]"
                style={{ width: '120px' }}
              >
                <GraduationCap className="w-3 h-3 shrink-0" />
                <span className="text-[9px] uppercase tracking-wide">Tuteurs :</span>
                <span className="text-xs font-bold">{tempTutors.length}</span>
                {session.activity?.maxStudentsPerTutor && (
                  <>
                    <span className="text-xs font-normal">/</span>
                    <span className="text-xs font-normal">
                      {session.activity.maxStudentsPerTutor}
                    </span>
                  </>
                )}
              </div>
              <div
                className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)] text-[var(--color-3-nuance-1)] border border-[var(--color-3-nuance-1)]"
                style={{ width: '120px' }}
              >
                <User className="w-3 h-3 shrink-0" />
                <span className="text-[9px] uppercase tracking-wide">Élèves :</span>
                <span className="text-xs font-bold">{tempStudents.length}</span>
                {maxStudents && (
                  <>
                    <span className="text-xs font-normal">/</span>
                    <span className="text-xs font-normal">{maxStudents}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapse Content */}
      {isExpanded && (
        <div className="matching-session-collapse-content">
          {/* Détails compacts de la séance */}
          <div className="matching-session-details">
            <div className="flex flex-wrap gap-2 items-center">
              <LabelBadge
                label={dateLabel}
                icon={Calendar}
                variant="outlined"
                color="var(--color-2-nuance-1)"
                size="sm"
                className="min-w-0 max-w-full"
              />
              <LabelBadge
                label={timeLabel}
                icon={Clock}
                variant="outlined"
                color="var(--color-1-nuance-1)"
                size="sm"
                className="min-w-0 max-w-full tabular-nums"
              />
              {establishmentDisplay && (
                <LabelBadge
                  label={establishmentDisplay}
                  icon={Building2}
                  variant="outlined"
                  color="var(--color-1-nuance-1)"
                  size="sm"
                  className="min-w-0 max-w-full"
                />
              )}
              {session.room && (
                <LabelBadge
                  label={session.room.name}
                  icon={MapPin}
                  variant="outlined"
                  color="var(--color-1-nuance-2)"
                  size="sm"
                  className="min-w-0 max-w-full"
                />
              )}
              {session.subjectNames && session.subjectNames.length > 0 && (
                <LabelBadge
                  label={session.subjectNames.join(', ')}
                  icon={BookOpen}
                  variant="outlined"
                  color="var(--color-1-nuance-2)"
                  size="sm"
                  className="min-w-0 max-w-full"
                />
              )}
              {recurrenceLabel && (
                <LabelBadge
                  label={recurrenceLabel}
                  icon={Repeat2}
                  variant="outlined"
                  color="var(--color-3-nuance-1)"
                  size="sm"
                  className="min-w-0 max-w-full"
                />
              )}
            </div>
          </div>

          {/* Dropzone unifiée pour Tuteurs et Élèves en mode matching */}
          <UnifiedDropZone
            tutors={tempTutors}
            students={tempStudents}
            maxTutors={session.activity?.maxStudentsPerTutor}
            maxStudents={maxStudents}
            onRemoveTutor={handleRemoveTutor}
            onRemoveStudent={handleRemoveStudent}
            sessionId={session.id}
            specificMatches={specificMatches}
            getTutorMatchedStudents={getTutorMatchedStudents}
            onUnmatchStudent={handleUnmatchStudent}
            mode="matching"
            studentsOverCapacity={studentsOverCapacity}
          />

          {/* Boutons Valider et Auto-Matching */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {tempTutors.length} {tempTutors.length > 1 ? 'tuteurs' : 'tuteur'} •{' '}
              {tempStudents.length} {tempStudents.length > 1 ? 'élèves' : 'élève'}
              {specificMatches.length > 0 && ` • ${specificMatches.length} matchings`}
            </p>
            <Button
              variant="secondary"
              size="md"
              icon={Workflow}
              iconPosition="left"
              onClick={() => setShowAutoAssignModal(true)}
              disabled={
                autoAssignMutation.isPending ||
                saveMutation.isPending ||
                tempTutors.length === 0 ||
                tempStudents.length === 0
              }
            >
              Affectation automatique
            </Button>
            <Button
              preset="form-save"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                autoAssignMutation.isPending ||
                tempTutors.length === 0 ||
                tempStudents.length === 0 ||
                specificMatches.length === 0
              }
            >
              Valider l'affectation
            </Button>
          </div>
        </div>
      )}

      {/* Modal d'auto-affectation */}
      <AutoAssignmentModal
        open={showAutoAssignModal}
        onClose={() => setShowAutoAssignModal(false)}
        onConfirm={() => {
          autoAssignMutation.mutate();
          setShowAutoAssignModal(false);
        }}
        isLoading={autoAssignMutation.isPending}
      />
    </div>
  );
};
