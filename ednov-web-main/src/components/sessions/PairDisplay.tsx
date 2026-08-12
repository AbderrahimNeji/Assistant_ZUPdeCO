import * as React from 'react';
import { GraduationCap, User, ArrowDown } from 'lucide-react';
import { PAIR_TYPE_CONFIG } from '@/components/matching/pair-configs';
import { ParticipantChip } from './ParticipantChip';
import type { AttendanceStatus } from '@/types/attendance.types';

type AssignmentSource = 'manual' | 'auto_binome_coeur' | 'auto_history' | 'auto_balanced';

type UserForDisplay = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName?: string | null;
  photoUrl: string | null;
  userProfiles?: Array<{ levelId?: string | null }>;
};

interface PairDisplayProps {
  tutorUser: UserForDisplay;
  studentUsers: UserForDisplay[];
  assignmentSource: AssignmentSource;
  tutorParticipantRole?: 'tutor' | 'volunteer';
  tutorAttendanceStatus?: AttendanceStatus;
  tutorAbsenceJustification?: string | null;
  studentsAttendanceData?: Map<string, { status: AttendanceStatus; justification?: string | null }>;
}

const SourceBadge: React.FC<{ source: AssignmentSource }> = ({ source }) => {
  const cfg = PAIR_TYPE_CONFIG[source] || PAIR_TYPE_CONFIG.manual;
  const Icon = cfg.icon;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border"
      style={{
        backgroundColor: `color-mix(in srgb, ${cfg.badgeColor} 15%, transparent)`,
        color: cfg.badgeColor,
        borderColor: cfg.badgeColor,
      }}
      title={cfg.label}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>{cfg.label}</span>
    </span>
  );
};

/**
 * PairDisplay - Affiche visuellement un binôme tuteur-élève(s)
 *
 * Layout:
 * - Tuteur en haut avec icône et badge
 * - Ligne de connexion visuelle
 * - Élève(s) en dessous
 * - Badge indiquant le type de matching
 */
export const PairDisplay: React.FC<PairDisplayProps> = ({
  tutorUser,
  studentUsers,
  assignmentSource,
  tutorParticipantRole = 'tutor',
  tutorAttendanceStatus,
  tutorAbsenceJustification,
  studentsAttendanceData,
}) => {
  return (
    <div
      className="rounded-lg border-2 p-3 relative"
      style={{
        background: 'color-mix(in srgb, var(--color-2-nuance-1) 3%, transparent)',
        borderColor: 'color-mix(in srgb, var(--color-2-nuance-1) 20%, transparent)',
      }}
    >
      {/* Badge source */}
      <div className="absolute top-2 right-2">
        <SourceBadge source={assignmentSource} />
      </div>

      {/* Tuteur */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{
              background: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
              borderColor: 'var(--color-2-nuance-1)',
            }}
          >
            <GraduationCap className="w-4 h-4" style={{ color: 'var(--color-2-nuance-1)' }} />
          </div>
          <div className="flex-1 pr-20">
            <ParticipantChip
              user={{
                firstName: tutorUser.firstName,
                lastName: tutorUser.lastName,
                photoUrl: tutorUser.photoUrl,
              }}
              role={tutorParticipantRole}
              size="md"
              showTooltip
              attendanceStatus={tutorAttendanceStatus}
              absenceJustification={tutorAbsenceJustification}
            />
          </div>
        </div>
      </div>

      {/* Ligne de connexion */}
      <div className="flex items-center justify-center my-2">
        <div
          className="h-px flex-1"
          style={{
            background:
              'linear-gradient(to right, var(--color-2-nuance-1), var(--color-3-nuance-1))',
            opacity: 0.3,
          }}
        />
        <ArrowDown
          className="mx-2 w-4 h-4"
          style={{
            color: 'var(--color-1-nuance-1)',
            opacity: 0.5,
          }}
        />
        <div
          className="h-px flex-1"
          style={{
            background:
              'linear-gradient(to right, var(--color-2-nuance-1), var(--color-3-nuance-1))',
            opacity: 0.3,
          }}
        />
      </div>

      {/* Élève(s) */}
      <div>
        <div className="flex items-start gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--color-3-nuance-1) 15%, transparent)',
              borderColor: 'var(--color-3-nuance-1)',
            }}
          >
            <User className="w-4 h-4" style={{ color: 'var(--color-3-nuance-1)' }} />
          </div>
          <div className="flex-1 flex flex-wrap gap-2">
            {studentUsers.map((student) => {
              const studentAttendance = studentsAttendanceData?.get(student.id);
              return (
                <ParticipantChip
                  key={student.id}
                  user={{
                    firstName: student.firstName,
                    lastName: student.lastName,
                    displayName: student.displayName,
                    photoUrl: student.photoUrl,
                  }}
                  role="student"
                  size="md"
                  showTooltip
                  attendanceStatus={studentAttendance?.status}
                  absenceJustification={studentAttendance?.justification}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
