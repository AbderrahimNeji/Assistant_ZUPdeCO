import * as React from 'react';
import { Star, Users } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CollapseReplaceForm } from '@/components/common/CollapseReplaceForm';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { AttendanceRow } from '@/components/sessions/AttendanceRow';
import { VscSessionParticipantsBlock } from '@/components/reports/VscSessionParticipantsBlock';
import { partitionParticipantsForReport } from '@/utils/report-participants';
import { toast } from '@/lib/toast';
import { getReport, updateReport } from '@/services/reports.service';
import { getSession } from '@/services/sessions.service';
import { getSubjects } from '@/services/academic.service';
import { TutorReportSection } from '@/components/reports/TutorReportSection';
import {
  TutorFeedbackFields,
  type TutorFeedbackValue,
} from '@/components/reports/TutorFeedbackFields';
import type { SessionReportAttendanceStatus, UpdateReportDto } from '@/types/report.types';
import type { ParticipantAttendance, AbsenceReason } from '@/types/attendance.types';
import { TUTOR_ABSENCE_REASONS, STUDENT_ABSENCE_REASONS } from '@/constants/attendance.constants';
import { useAuthStore } from '@/stores/authStore';
import { useFormValidation } from '@/hooks/useFormValidation';
import { reportValidationSchema } from '@/utils/validation-schemas';
import { parseReportSubjectField, serializeReportSubjectFromIds } from '@/utils/report-subject';
import {
  buildTutorReportSections,
  isMultiAuthorReport,
  isPrivilegedReportEditor,
  normalizeAuthorFeedbacks,
} from '@/utils/report-author-feedback';
import type { AttendanceStatus } from '@/types/attendance.types';

const buildAbsenceJustification = (
  role: 'tutor' | 'student' | 'volunteer',
  reason?: AbsenceReason,
): string | null => {
  if (!reason) return null;
  const isTutorOrVolunteer = role === 'tutor' || role === 'volunteer';
  const reasonLabels = isTutorOrVolunteer ? TUTOR_ABSENCE_REASONS : STUDENT_ABSENCE_REASONS;
  return reasonLabels[reason as keyof typeof reasonLabels];
};

const parseStoredAbsence = (
  role: 'tutor' | 'student' | 'volunteer',
  absenceJustification: string | null | undefined,
  absenceComment: string | null | undefined,
): Pick<ParticipantAttendance, 'absenceReason' | 'absenceComment'> => {
  if (!absenceJustification?.trim()) return {};
  const isTutorOrVolunteer = role === 'tutor' || role === 'volunteer';
  const reasonLabels = isTutorOrVolunteer ? TUTOR_ABSENCE_REASONS : STUDENT_ABSENCE_REASONS;
  for (const [key, label] of Object.entries(reasonLabels) as [AbsenceReason, string][]) {
    if (absenceJustification === label) {
      return {
        absenceReason: key,
        absenceComment: absenceComment?.trim() || undefined,
      };
    }
    if (absenceJustification.startsWith(`${label}: `)) {
      return {
        absenceReason: key,
        absenceComment:
          absenceComment?.trim() ||
          absenceJustification.slice(label.length + 2).trim() ||
          undefined,
      };
    }
  }
  return {};
};

interface EditReportViewProps {
  sessionId: string;
  reportId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditReportView({ sessionId, reportId, onClose, onSuccess }: EditReportViewProps) {
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const privileged = isPrivilegedReportEditor(roles.map((r) => r.code));

  const [subjectIds, setSubjectIds] = React.useState<string[]>([]);
  const [legacySubject, setLegacySubject] = React.useState<string | null>(null);
  const subjectIdsTouchedByUser = React.useRef(false);
  const [feedbackByAuthor, setFeedbackByAuthor] = React.useState<Map<string, TutorFeedbackValue>>(
    () => new Map(),
  );
  const [attendanceData, setAttendanceData] = React.useState<Map<string, ParticipantAttendance>>(
    () => new Map(),
  );
  const [attendanceErrors, setAttendanceErrors] = React.useState<Map<string, string>>(
    () => new Map(),
  );

  const validation = useFormValidation(reportValidationSchema);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', sessionId, reportId],
    queryFn: () => getReport(sessionId, reportId),
  });

  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId,
  });

  const { data: allSubjects } = useQuery({
    queryKey: ['subjects', 'edit-report'],
    queryFn: () => getSubjects({ page: 1, pageSize: 500 }),
    select: (response) => response.data,
  });

  const multiAuthor = isMultiAuthorReport(session, report ?? { authorFeedbacks: [], authorId: '' });
  const sections = buildTutorReportSections(
    session,
    report ?? { authorFeedbacks: [], authorId: '' },
  );
  const editableAuthorIds = React.useMemo(() => {
    if (!report || !user?.id) return new Set<string>();
    if (privileged) return new Set(sections.map((s) => s.authorUserId));
    return new Set([user.id]);
  }, [report, user?.id, privileged, sections]);

  React.useEffect(() => {
    if (!report) return;
    subjectIdsTouchedByUser.current = false;

    const feedbacks = normalizeAuthorFeedbacks(report);
    const map = new Map<string, TutorFeedbackValue>();
    for (const f of feedbacks) {
      map.set(f.idAuteur, {
        rating: f.rating,
        comment: f.comment ?? '',
        feeling: f.feeling ?? null,
      });
    }
    setFeedbackByAuthor(map);

    if (report.subjectIds && report.subjectIds.length > 0) {
      setSubjectIds([...report.subjectIds]);
      setLegacySubject(null);
    } else {
      const p = parseReportSubjectField(report.subject);
      if (p.type === 'legacy') {
        setSubjectIds([]);
        setLegacySubject(p.text);
      } else if (p.type === 'ids' && p.ids.length > 0) {
        setSubjectIds(p.ids);
        setLegacySubject(null);
      } else {
        setSubjectIds([]);
        setLegacySubject(null);
      }
    }

    const actorFeedback = feedbacks.find((f) => f.idAuteur === user?.id) ?? feedbacks[0];
    const pForVal = (() => {
      if (report.subjectIds && report.subjectIds.length > 0) {
        return { wire: serializeReportSubjectFromIds(report.subjectIds) };
      }
      return parseReportSubjectField(report.subject);
    })();
    const subjectForInitialValidation =
      'wire' in pForVal
        ? pForVal.wire
        : pForVal.type === 'ids' && pForVal.ids.length > 0
          ? serializeReportSubjectFromIds(pForVal.ids)
          : pForVal.type === 'legacy'
            ? pForVal.text
            : '';
    validation.validateInitialFormData({
      rating: actorFeedback?.rating ?? null,
      subject: subjectForInitialValidation,
      comment: actorFeedback?.comment ?? '',
    });
  }, [report, user?.id]);

  React.useEffect(() => {
    if (subjectIdsTouchedByUser.current) return;
    if (!session?.subjectIds?.length) return;
    if (!report) return;
    if (report.subjectIds && report.subjectIds.length > 0) return;
    const p = parseReportSubjectField(report.subject);
    if (p.type === 'legacy') return;
    if (p.type === 'ids' && p.ids.length > 0) return;
    setSubjectIds((prev) => (prev.length > 0 ? prev : [...session.subjectIds!]));
  }, [report, session]);

  const { vscParticipants, attendanceParticipants } = React.useMemo(
    () => partitionParticipantsForReport(session?.participants),
    [session?.participants],
  );

  React.useEffect(() => {
    if (!attendanceParticipants.length) {
      setAttendanceData(new Map());
      setAttendanceErrors(new Map());
      return;
    }
    const initial = new Map<string, ParticipantAttendance>();
    attendanceParticipants.forEach((participant) => {
      const status = (participant.attendanceStatus ||
        'absent') as ParticipantAttendance['attendanceStatus'];
      const parsed = parseStoredAbsence(
        participant.role,
        participant.absenceJustification,
        participant.absenceComment,
      );
      initial.set(participant.id, {
        participantId: participant.id,
        userId: participant.userId,
        role: participant.role,
        attendanceStatus: status,
        ...parsed,
      });
    });
    setAttendanceData(initial);
    setAttendanceErrors(new Map());
  }, [session?.participants]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateReportDto) => updateReport(sessionId, reportId, dto),
    onSuccess: () => {
      toast.success('Compte rendu modifié avec succès !');
      onSuccess?.();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Erreur lors de la modification du compte rendu');
    },
  });

  const subjectForValidation = React.useCallback((): string => {
    if (subjectIds.length > 0) return serializeReportSubjectFromIds(subjectIds);
    return legacySubject?.trim() ?? '';
  }, [subjectIds, legacySubject]);

  const getActorFeedback = (): TutorFeedbackValue | undefined => {
    if (!user?.id) return undefined;
    return feedbackByAuthor.get(user.id) ?? feedbackByAuthor.values().next().value;
  };

  const handleFeedbackChange = (authorUserId: string, next: TutorFeedbackValue) => {
    setFeedbackByAuthor((prev) => {
      const copy = new Map(prev);
      copy.set(authorUserId, next);
      return copy;
    });
    if (editableAuthorIds.has(authorUserId)) {
      validation.validateField('rating', next.rating, {
        rating: next.rating,
        subject: subjectForValidation(),
        comment: next.comment,
      } as never);
      validation.validateField('comment', next.comment, {
        rating: next.rating,
        subject: subjectForValidation(),
        comment: next.comment,
      } as never);
      validation.markAsTouched('rating');
      validation.markAsDirty('rating');
    }
  };

  const handleSubjectIdsChange = (values: string[]) => {
    subjectIdsTouchedByUser.current = true;
    if (values.length > 0) setLegacySubject(null);
    setSubjectIds(values);
    const subj =
      values.length > 0 ? serializeReportSubjectFromIds(values) : (legacySubject?.trim() ?? '');
    const actor = getActorFeedback();
    validation.validateField('subject', subj, {
      rating: actor?.rating,
      comment: actor?.comment,
      subject: subj,
    } as never);
    validation.markAsTouched('subject');
    validation.markAsDirty('subject');
  };

  const handleBlur = (field: string) => {
    validation.markAsTouched(field);
  };

  const validateAttendance = (): boolean => {
    const errors = new Map<string, string>();
    let isValid = true;
    attendanceData.forEach((value, participantId) => {
      if (value.attendanceStatus === 'absent') {
        if (!value.absenceReason) {
          errors.set(participantId, "Un motif d'absence est requis");
          isValid = false;
        } else if (value.absenceReason === 'other' && !value.absenceComment?.trim()) {
          errors.set(participantId, 'Veuillez préciser le motif');
          isValid = false;
        }
      }
    });
    setAttendanceErrors(errors);
    return isValid;
  };

  const canEditAllAuthors = privileged && sections.length > 1;

  const handleSubmit = () => {
    const actor = getActorFeedback();
    const subj = subjectForValidation();
    if (canEditAllAuthors) {
      if (subjectIds.length === 0 && !legacySubject?.trim()) {
        validation.validateField('subject', subj, {
          rating: null,
          subject: subj,
          comment: '',
        } as never);
        validation.markAsTouched('subject');
        return;
      }
    } else {
      const isValid = validation.validateForm({
        rating: actor?.rating ?? null,
        subject: subj,
        comment: actor?.comment ?? '',
      });
      if (!isValid) return;
    }

    if (attendanceParticipants.length > 0 && !validateAttendance()) {
      toast.error("Veuillez compléter les présences (motifs d'absence requis)");
      return;
    }

    const participantPayload = attendanceParticipants.map((p) => {
      const att = attendanceData.get(p.id);
      const status = (att?.attendanceStatus ??
        p.attendanceStatus ??
        'absent') as SessionReportAttendanceStatus;
      const absenceJustification =
        status === 'absent' ? buildAbsenceJustification(p.role, att?.absenceReason) : null;
      const absenceComment = status === 'absent' ? att?.absenceComment?.trim() || null : null;
      return {
        participantId: p.id,
        attendanceStatus: status,
        absenceJustification,
        absenceComment,
      };
    });

    const authorFeedbacksPatch = [...feedbackByAuthor.entries()]
      .filter(([id]) => canEditAllAuthors || editableAuthorIds.has(id))
      .map(([idAuteur, v]) => ({
        idAuteur,
        rating: v.rating,
        comment: v.comment || null,
        feeling: v.feeling,
      }));

    const subjectPayload: Pick<UpdateReportDto, 'subject' | 'subjectIds'> =
      subjectIds.length > 0
        ? { subjectIds }
        : legacySubject?.trim()
          ? { subject: legacySubject.trim() }
          : { subjectIds: [] };

    const dto: UpdateReportDto = {
      authorFeedbacks: authorFeedbacksPatch.length > 0 ? authorFeedbacksPatch : undefined,
      ...subjectPayload,
      ...(participantPayload.length > 0 ? { participants: participantPayload } : {}),
    };

    updateMutation.mutate(dto);
  };

  const sessionSubjects = React.useMemo(() => {
    if (!session?.subjectIds || !allSubjects) return [];
    return allSubjects.filter((s) => session.subjectIds.includes(s.id));
  }, [session, allSubjects]);

  const subjectOptions = React.useMemo(
    () => sessionSubjects.map((s) => ({ value: s.id, label: s.label })),
    [sessionSubjects],
  );

  const singleSection = !multiAuthor && sections.length === 1 ? sections[0] : null;
  const singleFeedback = singleSection
    ? feedbackByAuthor.get(singleSection.authorUserId)
    : getActorFeedback();

  return (
    <CollapseReplaceForm
      formType="edit"
      title="Modifier le compte rendu"
      subtitle="Modifiez les informations du compte rendu"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Enregistrer"
      isSubmitting={updateMutation.isPending}
      isValid={
        canEditAllAuthors
          ? subjectIds.length > 0 || !!legacySubject?.trim()
          : validation.isFormValid()
      }
      isLoading={isLoading}
    >
      <div className="form-section">
        <h4 className="form-section-title">
          <Star className="w-4 h-4" />
          Matières
        </h4>
        <MultiSelect
          label="Matières abordées"
          placeholder="Sélectionner une ou plusieurs matières"
          options={subjectOptions}
          value={subjectIds}
          onChange={handleSubjectIdsChange}
          onBlur={() => handleBlur('subject')}
          state={validation.getFieldState('subject')}
          error={validation.getFieldError('subject')}
          helperText="Matières abordées durant la séance"
          maxVisibleTags={3}
        />
      </div>

      {multiAuthor &&
        sections.map((section) => {
          const value = feedbackByAuthor.get(section.authorUserId) ?? {
            rating: null,
            comment: '',
            feeling: null,
          };
          const canEdit = editableAuthorIds.has(section.authorUserId);
          return (
            <TutorReportSection
              key={section.authorUserId}
              section={section}
              mode="edit"
              feedbackValue={value}
              onFeedbackChange={(next) => handleFeedbackChange(section.authorUserId, next)}
              feedbackReadOnly={!canEdit}
              ratingState={canEdit ? validation.getFieldState('rating') : undefined}
              ratingError={canEdit ? validation.getFieldError('rating') : undefined}
              commentState={canEdit ? validation.getFieldState('comment') : undefined}
              commentError={canEdit ? validation.getFieldError('comment') : undefined}
              onBlurRating={() => handleBlur('rating')}
              onBlurComment={() => handleBlur('comment')}
            />
          );
        })}

      {multiAuthor && (vscParticipants.length > 0 || attendanceParticipants.length > 0) && (
        <>
          <VscSessionParticipantsBlock participants={vscParticipants} variant="edit" />
          {attendanceParticipants.length > 0 && (
            <div className="form-section">
              <h4 className="form-section-title">
                <Users className="w-4 h-4" />
                Présences
              </h4>
              <div className="rounded-lg border border-border bg-muted/25 p-4 space-y-3">
                {[...attendanceParticipants]
                  .sort(
                    (a, b) =>
                      (({ tutor: 0, student: 1 })[a.role] ?? 2) -
                      ({ tutor: 0, student: 1 }[b.role] ?? 2),
                  )
                  .map((participant) => {
                    const value =
                      attendanceData.get(participant.id) ??
                      ({
                        participantId: participant.id,
                        userId: participant.userId,
                        role: participant.role,
                        attendanceStatus: (participant.attendanceStatus ||
                          'absent') as ParticipantAttendance['attendanceStatus'],
                        ...parseStoredAbsence(
                          participant.role,
                          participant.absenceJustification,
                          participant.absenceComment,
                        ),
                      } satisfies ParticipantAttendance);
                    return (
                      <AttendanceRow
                        key={participant.id}
                        participant={participant}
                        value={value}
                        error={attendanceErrors.get(participant.id)}
                        onChange={(next) => {
                          setAttendanceData((prev) => {
                            const copy = new Map(prev);
                            copy.set(participant.id, next);
                            return copy;
                          });
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {!multiAuthor && singleSection && singleFeedback && (
        <>
          <div className="form-section">
            <TutorFeedbackFields
              value={singleFeedback}
              onChange={(next) => handleFeedbackChange(singleSection.authorUserId, next)}
              ratingState={validation.getFieldState('rating')}
              ratingError={validation.getFieldError('rating')}
              commentState={validation.getFieldState('comment')}
              commentError={validation.getFieldError('comment')}
              onBlurRating={() => handleBlur('rating')}
              onBlurComment={() => handleBlur('comment')}
            />
          </div>
          <VscSessionParticipantsBlock participants={vscParticipants} variant="edit" />
          {attendanceParticipants.length > 0 && (
            <div className="form-section">
              <h4 className="form-section-title">
                <Users className="w-4 h-4" />
                Présences
              </h4>
              <div className="rounded-lg border border-border bg-muted/25 p-4 space-y-3">
                {attendanceParticipants.map((participant) => {
                  const value =
                    attendanceData.get(participant.id) ??
                    ({
                      participantId: participant.id,
                      userId: participant.userId,
                      role: participant.role,
                      attendanceStatus: (participant.attendanceStatus ||
                        'absent') as ParticipantAttendance['attendanceStatus'],
                      ...parseStoredAbsence(
                        participant.role,
                        participant.absenceJustification,
                        participant.absenceComment,
                      ),
                    } satisfies ParticipantAttendance);
                  return (
                    <AttendanceRow
                      key={participant.id}
                      participant={participant}
                      value={value}
                      error={attendanceErrors.get(participant.id)}
                      onChange={(next) => {
                        setAttendanceData((prev) => {
                          const copy = new Map(prev);
                          copy.set(participant.id, next);
                          return copy;
                        });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {multiAuthor &&
        !canEditAllAuthors &&
        sections.some((s) => !editableAuthorIds.has(s.authorUserId)) && (
          <p className="text-sm text-muted-foreground px-1">
            Les évaluations des autres tuteurs sont en lecture seule. Seule votre section est
            modifiable.
          </p>
        )}
    </CollapseReplaceForm>
  );
}
