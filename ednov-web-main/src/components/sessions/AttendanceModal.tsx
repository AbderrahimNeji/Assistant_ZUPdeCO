import * as React from 'react';
import {
  UserCheck,
  HeartHandshake,
  Users,
  GraduationCap,
  UserCircle,
  X,
  Check,
} from 'lucide-react';
import { BaseModal } from '@/components/common/modals/BaseModal';
import { Button } from '@/components/forms/Button';
import { AttendanceRow } from './AttendanceRow';
import { updateParticipantAttendance } from '@/services/sessions.service';
import { toast } from '@/lib/toast';
import type { SessionWithParticipants, SessionParticipant } from '@/types/session.types';
import { getVolunteerRoleLabel } from '@/types/user.types';
import type { ParticipantAttendance, AbsenceReason } from '@/types/attendance.types';
import { TUTOR_ABSENCE_REASONS, STUDENT_ABSENCE_REASONS } from '@/constants/attendance.constants';

interface AttendanceModalProps {
  open: boolean;
  onClose: () => void;
  session: SessionWithParticipants;
  onSuccess: () => void;
}

const buildAbsenceJustification = (
  role: 'tutor' | 'student' | 'volunteer',
  reason?: AbsenceReason,
): string | null => {
  if (!reason) return null;

  const isTutorOrVolunteer = role === 'tutor' || role === 'volunteer';
  const reasonLabels = isTutorOrVolunteer ? TUTOR_ABSENCE_REASONS : STUDENT_ABSENCE_REASONS;
  return reasonLabels[reason as keyof typeof reasonLabels];
};

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  open,
  onClose,
  session,
  onSuccess,
}) => {
  const [attendanceData, setAttendanceData] = React.useState<Map<string, ParticipantAttendance>>(
    new Map(),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<Map<string, string>>(new Map());

  React.useEffect(() => {
    if (open && session.participants) {
      const initialData = new Map<string, ParticipantAttendance>();
      session.participants.forEach((participant) => {
        initialData.set(participant.id, {
          participantId: participant.id,
          userId: participant.userId,
          role: participant.role,
          attendanceStatus: (participant.attendanceStatus ||
            'pending') as ParticipantAttendance['attendanceStatus'],
        });
      });
      setAttendanceData(initialData);
      setValidationErrors(new Map());
    }
  }, [open, session.participants]);

  const handleParticipantChange = (participantId: string, value: ParticipantAttendance) => {
    setAttendanceData((prev) => {
      const newMap = new Map(prev);
      newMap.set(participantId, value);
      return newMap;
    });
  };

  const validateForm = (): boolean => {
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

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setIsSubmitting(true);

    try {
      const updates = Array.from(attendanceData.values())
        .map((attendance) => {
          const participant = session.participants?.find((p) => p.id === attendance.participantId);
          if (!participant) return null;

          const absenceJustification =
            attendance.attendanceStatus === 'absent'
              ? buildAbsenceJustification(attendance.role, attendance.absenceReason)
              : null;
          const absenceComment =
            attendance.attendanceStatus === 'absent'
              ? attendance.absenceComment?.trim() || null
              : null;

          return updateParticipantAttendance(session.id, attendance.participantId, {
            attendanceStatus: attendance.attendanceStatus,
            absenceJustification,
            absenceComment,
          });
        })
        .filter(Boolean);

      await Promise.all(updates);

      toast.success('Présences mises à jour avec succès');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Erreur lors de la mise à jour des présences');
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupParticipants = () => {
    const participants = session.participants || [];
    const pairs = session.studentTutorPairs || [];

    const pairsByTutor = new Map<string, SessionParticipant[]>();
    const matchedTutorIds = new Set<string>();
    const matchedStudentIds = new Set<string>();

    pairs.forEach((pair) => {
      matchedTutorIds.add(pair.tutorUserId);
      matchedStudentIds.add(pair.studentUserId);

      if (!pairsByTutor.has(pair.tutorUserId)) {
        pairsByTutor.set(pair.tutorUserId, []);
      }

      const studentParticipant = participants.find(
        (p) => p.userId === pair.studentUserId && p.role === 'student',
      );
      if (studentParticipant) {
        const tutorStudents = pairsByTutor.get(pair.tutorUserId);
        if (tutorStudents) {
          tutorStudents.push(studentParticipant);
        }
      }
    });

    const binomes: Array<{ tutor: SessionParticipant; students: SessionParticipant[] }> = [];
    pairsByTutor.forEach((students, tutorId) => {
      const tutorParticipant = participants.find(
        (p) => p.userId === tutorId && (p.role === 'tutor' || p.role === 'volunteer'),
      );
      if (tutorParticipant) {
        binomes.push({ tutor: tutorParticipant, students });
      }
    });

    const unmatchedTutors = participants.filter(
      (p) => (p.role === 'tutor' || p.role === 'volunteer') && !matchedTutorIds.has(p.userId),
    );
    const unmatchedStudents = participants.filter(
      (p) => p.role === 'student' && !matchedStudentIds.has(p.userId),
    );

    return { binomes, unmatchedTutors, unmatchedStudents };
  };

  const { binomes, unmatchedTutors, unmatchedStudents } = groupParticipants();
  const hasBinomes = binomes.length > 0;
  const hasUnmatched = unmatchedTutors.length > 0 || unmatchedStudents.length > 0;

  React.useEffect(() => {
    const errors = new Map<string, string>();

    attendanceData.forEach((value, participantId) => {
      if (value.attendanceStatus === 'absent') {
        if (!value.absenceReason) {
          errors.set(participantId, "Un motif d'absence est requis");
        } else if (value.absenceReason === 'other' && !value.absenceComment?.trim()) {
          errors.set(participantId, 'Veuillez préciser le motif');
        }
      }
    });

    setValidationErrors(errors);
  }, [attendanceData]);

  const isFormValid = validationErrors.size === 0;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      size="2xl"
      header={{
        icon: UserCheck,
        iconSize: 'md',
        iconColor: 'var(--color-2-nuance-1)',
        iconBgColor: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
        title: 'Gestion des présences',
        titleSize: 'lg',
        titleWeight: 'semibold',
        titleColor: 'var(--color-1-nuance-1)',
      }}
      footer={
        <div className="flex gap-3 justify-end w-full">
          <Button
            variant="cancel"
            icon={X}
            iconPosition="left"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            icon={Check}
            iconPosition="left"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || !isFormValid}
          >
            Valider les présences
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {hasBinomes && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <HeartHandshake className="w-5 h-5 text-[var(--color-2-nuance-1)]" />
              <h4 className="text-base font-semibold text-[var(--color-1-nuance-1)]">
                Binômes Élève-Tuteur
              </h4>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full border"
                style={{
                  background: 'color-mix(in srgb, var(--color-2-nuance-1) 12%, transparent)',
                  color: 'var(--color-2-nuance-1)',
                  borderColor: 'var(--color-2-nuance-1)',
                }}
              >
                {binomes.length}
              </span>
            </div>

            <div className="space-y-4">
              {binomes.map(({ tutor, students }) => (
                <div
                  key={tutor.id}
                  className="rounded-lg border-2 p-4 space-y-3"
                  style={{
                    background: 'color-mix(in srgb, var(--color-2-nuance-1) 3%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-2-nuance-1) 20%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
                    <span className="text-xs font-medium text-[var(--color-2-nuance-1)]">
                      {tutor.role === 'volunteer'
                        ? (getVolunteerRoleLabel(tutor.user) ?? 'Bénévole')
                        : 'Tuteur'}
                    </span>
                  </div>
                  {(() => {
                    const tutorData = attendanceData.get(tutor.id);
                    if (!tutorData) return null;
                    return (
                      <AttendanceRow
                        participant={tutor}
                        value={tutorData}
                        onChange={(value) => handleParticipantChange(tutor.id, value)}
                        error={validationErrors.get(tutor.id)}
                      />
                    );
                  })()}

                  <div className="flex items-center gap-2 mb-2 mt-4">
                    <UserCircle className="w-4 h-4 text-[var(--color-3-nuance-1)]" />
                    <span className="text-xs font-medium text-[var(--color-3-nuance-1)]">
                      {students.length === 1 ? 'Élève' : 'Élèves'}
                    </span>
                  </div>
                  {students.map((student) => {
                    const studentData = attendanceData.get(student.id);
                    if (!studentData) return null;
                    return (
                      <AttendanceRow
                        key={student.id}
                        participant={student}
                        value={studentData}
                        onChange={(value) => handleParticipantChange(student.id, value)}
                        error={validationErrors.get(student.id)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasUnmatched && (
          <div>
            {hasBinomes && (
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[var(--color-1-nuance-1)]" />
                <h4 className="text-base font-semibold text-[var(--color-1-nuance-1)]">
                  Autres Participants
                </h4>
              </div>
            )}

            {unmatchedTutors.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
                  <span className="text-sm font-medium text-[var(--color-2-nuance-1)]">
                    Tuteurs et Bénévoles
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: 'color-mix(in srgb, var(--color-2-nuance-1) 12%, transparent)',
                      color: 'var(--color-2-nuance-1)',
                      borderColor: 'var(--color-2-nuance-1)',
                    }}
                  >
                    {unmatchedTutors.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {unmatchedTutors.map((tutor) => {
                    const tutorData = attendanceData.get(tutor.id);
                    if (!tutorData) return null;
                    return (
                      <AttendanceRow
                        key={tutor.id}
                        participant={tutor}
                        value={tutorData}
                        onChange={(value) => handleParticipantChange(tutor.id, value)}
                        error={validationErrors.get(tutor.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {unmatchedStudents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCircle className="w-4 h-4 text-[var(--color-3-nuance-1)]" />
                  <span className="text-sm font-medium text-[var(--color-3-nuance-1)]">Élèves</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: 'color-mix(in srgb, var(--color-3-nuance-1) 12%, transparent)',
                      color: 'var(--color-3-nuance-1)',
                      borderColor: 'var(--color-3-nuance-1)',
                    }}
                  >
                    {unmatchedStudents.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {unmatchedStudents.map((student) => {
                    const studentData = attendanceData.get(student.id);
                    if (!studentData) return null;
                    return (
                      <AttendanceRow
                        key={student.id}
                        participant={student}
                        value={studentData}
                        onChange={(value) => handleParticipantChange(student.id, value)}
                        error={validationErrors.get(student.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!hasBinomes && !hasUnmatched && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground opacity-40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Aucun participant dans cette séance
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
