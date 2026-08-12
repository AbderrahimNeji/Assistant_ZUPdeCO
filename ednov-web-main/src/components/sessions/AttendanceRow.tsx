import * as React from 'react';
import { Avatar } from '@/components/sessions/Avatar';
import { Select, SelectOption } from '@/components/forms/Select';
import { Input } from '@/components/forms/Input';
import {
  ATTENDANCE_STATUS_LABELS,
  TUTOR_ABSENCE_REASONS,
  STUDENT_ABSENCE_REASONS,
} from '@/constants/attendance.constants';
import type {
  AttendanceStatus,
  AbsenceReason,
  ParticipantAttendance,
} from '@/types/attendance.types';
import type { SessionParticipant } from '@/types/session.types';

interface AttendanceRowProps {
  participant: SessionParticipant;
  value: ParticipantAttendance;
  onChange: (value: ParticipantAttendance) => void;
  error?: string;
}

const getInitials = (firstName: string | null, lastName: string | null) => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
};

const getDisplayName = (firstName: string | null, lastName: string | null) => {
  return `${firstName || ''} ${lastName || ''}`.trim() || 'Inconnu';
};

export const AttendanceRow: React.FC<AttendanceRowProps> = ({
  participant,
  value,
  onChange,
  error,
}) => {
  const attendanceStatusOptions: SelectOption[] = [
    { value: 'present', label: ATTENDANCE_STATUS_LABELS.present },
    { value: 'absent', label: ATTENDANCE_STATUS_LABELS.absent },
    { value: 'excused', label: ATTENDANCE_STATUS_LABELS.excused },
    { value: 'pending', label: ATTENDANCE_STATUS_LABELS.pending },
  ];

  const isTutorOrVolunteer = participant.role === 'tutor' || participant.role === 'volunteer';
  const absenceReasons = isTutorOrVolunteer ? TUTOR_ABSENCE_REASONS : STUDENT_ABSENCE_REASONS;

  const absenceReasonOptions: SelectOption[] = Object.entries(absenceReasons).map(
    ([key, label]) => ({
      value: key,
      label,
    }),
  );

  const handleStatusChange = (status: string) => {
    const newValue: ParticipantAttendance = {
      ...value,
      attendanceStatus: status as AttendanceStatus,
    };

    if (status !== 'absent') {
      delete newValue.absenceReason;
      delete newValue.absenceComment;
    }

    onChange(newValue);
  };

  const handleReasonChange = (reason: string) => {
    const newValue: ParticipantAttendance = {
      ...value,
      absenceReason: reason as AbsenceReason,
    };

    onChange(newValue);
  };

  const handleJustificationChange = (justification: string) => {
    onChange({
      ...value,
      absenceComment: justification,
    });
  };

  const roleColors = {
    tutor: 'var(--color-2-nuance-1)',
    student: 'var(--color-1-nuance-1)',
    volunteer: 'var(--color-3-nuance-1)',
  };

  const roleLabels = {
    tutor: 'Tuteur',
    student: 'Élève',
    volunteer: 'VSC',
  };

  return (
    <div
      className="space-y-3 p-4 rounded-lg border-2 bg-[color-mix(in_srgb,var(--color-1-nuance-3)_5%,transparent)]"
      style={{ borderColor: 'color-mix(in srgb, var(--color-1-nuance-3) 30%, transparent)' }}
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={participant.user.photoUrl}
          fallback={getInitials(participant.user.firstName, participant.user.lastName)}
          size="sm"
        />
        <div className="flex-1">
          <p className="font-medium text-foreground text-sm">
            {getDisplayName(participant.user.firstName, participant.user.lastName)}
          </p>
          <p
            className="text-xs text-muted-foreground"
            style={{ color: roleColors[participant.role] }}
          >
            {roleLabels[participant.role]}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select
          label="Statut de présence"
          placeholder="Sélectionner un statut"
          options={attendanceStatusOptions}
          value={value.attendanceStatus}
          onChange={handleStatusChange}
          required
          size="sm"
        />

        {value.attendanceStatus === 'absent' && (
          <Select
            label="Motif d'absence"
            placeholder="Sélectionner un motif"
            options={absenceReasonOptions}
            value={value.absenceReason || ''}
            onChange={handleReasonChange}
            required
            size="sm"
            error={error}
          />
        )}
      </div>

      {value.attendanceStatus === 'absent' && value.absenceReason && (
        <Input
          label="Précisez le motif"
          placeholder="Saisissez le motif d'absence"
          value={value.absenceComment || ''}
          onChange={(e) => handleJustificationChange(e.target.value)}
          required
          inputSize="sm"
        />
      )}
    </div>
  );
};
