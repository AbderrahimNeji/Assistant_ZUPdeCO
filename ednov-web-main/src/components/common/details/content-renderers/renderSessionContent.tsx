import * as React from 'react';
import {
  Calendar,
  Clock,
  Building2,
  BookOpen,
  Users,
  Tag,
  MapPin,
  Video,
  GraduationCap,
  UserCircle,
  Minus,
  HeartHandshake,
  Repeat2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DetailBadge } from '../DetailBadge';
import { EmptyPlaceholder } from '../EmptyPlaceholder';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { ParticipantChip } from '@/components/sessions/ParticipantChip';
import { PairDisplay } from '@/components/sessions/PairDisplay';
import {
  SESSION_STATUS_CONFIG,
  SESSION_TYPE_CONFIG,
  SESSION_RECURRENCE_LABELS,
} from '@/components/sessions/session-configs';
import type { SessionWithParticipants } from '@/types/session.types';
import type { AttendanceStatus } from '@/types/attendance.types';

type StudentWithSource = {
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    userProfiles?: Array<{ levelId?: string | null }>;
  };
  source: string;
};

type AttendanceCount = {
  present: number;
  absent: number;
  excused: number;
  pending: number;
};

type StudentUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  userProfiles?: Array<{ levelId?: string | null }>;
};

const groupPairsByTutor = (session: SessionWithParticipants): Map<string, StudentWithSource[]> => {
  const pairsByTutor = new Map<string, StudentWithSource[]>();

  if (!session.studentTutorPairs || session.studentTutorPairs.length === 0) {
    return pairsByTutor;
  }

  session.studentTutorPairs.forEach((pair) => {
    if (!pairsByTutor.has(pair.tutorUserId)) {
      pairsByTutor.set(pair.tutorUserId, []);
    }
    const studentParticipant = session.participants?.find(
      (p) => p.userId === pair.studentUserId && p.role === 'student',
    );
    if (studentParticipant?.user) {
      const tutorStudents = pairsByTutor.get(pair.tutorUserId);
      if (tutorStudents) {
        tutorStudents.push({
          student: studentParticipant.user,
          source: pair.assignmentSource,
        });
      }
    }
  });

  return pairsByTutor;
};

const countAttendanceByStatus = (
  participants: SessionWithParticipants['participants'],
): AttendanceCount => {
  const allParticipants = (participants || []).filter((p) => p.role !== 'volunteer');
  return {
    present: allParticipants.filter((p) => p.attendanceStatus === 'present').length,
    absent: allParticipants.filter((p) => p.attendanceStatus === 'absent').length,
    excused: allParticipants.filter((p) => p.attendanceStatus === 'excused').length,
    pending: allParticipants.filter((p) => p.attendanceStatus === 'pending' || !p.attendanceStatus)
      .length,
  };
};

const getStatusColor = (status: string): 'success' | 'error' => {
  return status === 'completed' || status === 'confirmed' ? 'success' : 'error';
};

const getSessionFormatLabel = (format: string | undefined): string => {
  if (format === 'in_person') return '📍 Présentiel';
  if (format === 'remote') return '💻 Distanciel';
  if (format === 'hybrid') return '🔄 Hybride';
  return 'Non spécifié';
};

const groupStudentsBySource = (studentsData: StudentWithSource[]) => {
  const studentsBySource = new Map<string, StudentUser[]>();
  studentsData.forEach(({ student, source }) => {
    if (!studentsBySource.has(source)) {
      studentsBySource.set(source, []);
    }
    const studentsForSource = studentsBySource.get(source);
    if (studentsForSource) {
      studentsForSource.push(student);
    }
  });
  return studentsBySource;
};

const createStudentsAttendanceMap = (
  studentsData: StudentWithSource[],
  participants: SessionWithParticipants['participants'],
) => {
  const map = new Map<string, { status: AttendanceStatus; justification?: string | null }>();
  studentsData.forEach(({ student }) => {
    const studentParticipant = participants?.find(
      (p) => p.userId === student.id && p.role === 'student',
    );
    if (studentParticipant) {
      map.set(student.id, {
        status: (studentParticipant.attendanceStatus as AttendanceStatus) || 'pending',
        justification: studentParticipant.absenceJustification,
      });
    }
  });
  return map;
};

const AttendanceStatusBadges: React.FC<{ countByStatus: AttendanceCount }> = ({
  countByStatus,
}) => {
  const hasAnyStatus =
    countByStatus.present > 0 || countByStatus.absent > 0 || countByStatus.excused > 0;

  if (!hasAnyStatus) return null;

  return (
    <div className="flex flex-wrap gap-2 pb-4 border-b border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
      {countByStatus.present > 0 && (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2"
          style={{
            background: 'color-mix(in srgb, rgb(10, 134, 66) 10%, transparent)',
            color: 'rgb(10, 134, 66)',
            borderColor: 'rgb(10, 134, 66)',
          }}
        >
          <span className="font-bold">{countByStatus.present}</span> Présent
          {countByStatus.present > 1 ? 's' : ''}
        </span>
      )}
      {countByStatus.absent > 0 && (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2"
          style={{
            background: 'color-mix(in srgb, rgb(var(--color-error)) 10%, transparent)',
            color: 'rgb(var(--color-error))',
            borderColor: 'rgb(var(--color-error))',
          }}
        >
          <span className="font-bold">{countByStatus.absent}</span> Absent
          {countByStatus.absent > 1 ? 's' : ''}
        </span>
      )}
      {countByStatus.excused > 0 && (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2"
          style={{
            background: 'color-mix(in srgb, rgb(var(--color-warning)) 10%, transparent)',
            color: 'rgb(var(--color-warning))',
            borderColor: 'rgb(var(--color-warning))',
          }}
        >
          <span className="font-bold">{countByStatus.excused}</span> Excusé
          {countByStatus.excused > 1 ? 's' : ''}
        </span>
      )}
      {countByStatus.pending > 0 && (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2"
          style={{
            background: 'color-mix(in srgb, var(--muted-foreground) 10%, transparent)',
            color: 'var(--muted-foreground)',
            borderColor: 'var(--muted-foreground)',
          }}
        >
          <span className="font-bold">{countByStatus.pending}</span> En attente
        </span>
      )}
    </div>
  );
};

const PairSection: React.FC<{
  pairsByTutor: Map<string, StudentWithSource[]>;
  session: SessionWithParticipants;
}> = ({ pairsByTutor, session }) => {
  if (pairsByTutor.size === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <HeartHandshake className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
        <h4 className="text-sm font-semibold text-[var(--color-1-nuance-1)]">
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
          {pairsByTutor.size}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from(pairsByTutor.entries()).map(([tutorId, studentsData]) => {
          const tutorParticipant = session.participants?.find(
            (p) => p.userId === tutorId && (p.role === 'tutor' || p.role === 'volunteer'),
          );
          const pairWithTutor = session.studentTutorPairs?.find((p) => p.tutorUserId === tutorId);
          const tutorUserForPair = tutorParticipant?.user ?? pairWithTutor?.tutorUser;

          if (!tutorUserForPair) return null;

          const tutorChipRole = tutorParticipant?.role === 'volunteer' ? 'volunteer' : 'tutor';
          const studentsBySource = groupStudentsBySource(studentsData);
          const studentsAttendanceMap = createStudentsAttendanceMap(
            studentsData,
            session.participants,
          );

          return Array.from(studentsBySource.entries()).map(([source, studentsForSource], idx) => (
            <PairDisplay
              key={`${tutorId}-${source}-${idx}`}
              tutorUser={tutorUserForPair}
              studentUsers={studentsForSource}
              assignmentSource={
                source as 'manual' | 'auto_binome_coeur' | 'auto_history' | 'auto_balanced'
              }
              tutorParticipantRole={tutorChipRole}
              tutorAttendanceStatus={
                (tutorParticipant?.attendanceStatus as AttendanceStatus) || 'pending'
              }
              tutorAbsenceJustification={tutorParticipant?.absenceJustification}
              studentsAttendanceData={studentsAttendanceMap}
            />
          ));
        })}
      </div>
    </div>
  );
};

const UnmatchedParticipantsSection: React.FC<{
  unmatchedTutors: any[];
  unmatchedVolunteers: any[];
  unmatchedStudents: any[];
  hasBinomes: boolean;
}> = ({ unmatchedTutors, unmatchedVolunteers, unmatchedStudents, hasBinomes }) => {
  const hasUnmatched =
    unmatchedTutors.length > 0 || unmatchedStudents.length > 0 || unmatchedVolunteers.length > 0;

  if (!hasUnmatched) return null;

  const hasUnmatchedTutors = unmatchedTutors.length > 0;
  const hasUnmatchedVsc = unmatchedVolunteers.length > 0;

  return (
    <div>
      {hasBinomes && (
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-[var(--color-1-nuance-1)]">
            Autres Participants
          </h4>
        </div>
      )}
      <div className="participants-layout">
        {hasUnmatchedTutors && (
          <div className="participants-group">
            <div className="participants-group-header">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{unmatchedTutors.length === 1 ? 'Tuteur' : 'Tuteurs'}</span>
              <span className="participants-group-count">{unmatchedTutors.length}</span>
            </div>
            <div className="participant-chip-list">
              {unmatchedTutors.map((tutor) => (
                <ParticipantChip
                  key={tutor.id}
                  user={{
                    firstName: tutor.user.firstName,
                    lastName: tutor.user.lastName,
                    photoUrl: tutor.user.photoUrl,
                  }}
                  role="tutor"
                  size="md"
                  showTooltip
                  attendanceStatus={(tutor.attendanceStatus as AttendanceStatus) || 'pending'}
                  absenceJustification={tutor.absenceJustification}
                />
              ))}
            </div>
          </div>
        )}

        {hasUnmatchedVsc && (
          <div className="participants-group">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-[var(--color-3-nuance-1)]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-3-nuance-1)]">
                VSC
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full border"
                style={{
                  background: 'color-mix(in srgb, var(--color-3-nuance-1) 12%, transparent)',
                  color: 'var(--color-3-nuance-1)',
                  borderColor: 'var(--color-3-nuance-1)',
                }}
              >
                {unmatchedVolunteers.length}
              </span>
            </div>
            <div className="participant-chip-list">
              {unmatchedVolunteers.map((volunteer) => (
                <ParticipantChip
                  key={volunteer.id}
                  user={{
                    firstName: volunteer.user.firstName,
                    lastName: volunteer.user.lastName,
                    photoUrl: volunteer.user.photoUrl,
                  }}
                  role="volunteer"
                  volunteerRoleLabel="VSC"
                  size="md"
                  showTooltip
                />
              ))}
            </div>
          </div>
        )}

        {(hasUnmatchedTutors || hasUnmatchedVsc) && unmatchedStudents.length > 0 && (
          <div className="participants-divider" aria-hidden="true" />
        )}

        {unmatchedStudents.length > 0 && (
          <div className="participants-group">
            <div className="participants-group-header participants-group-header--student">
              <UserCircle className="w-3.5 h-3.5" />
              <span>{unmatchedStudents.length === 1 ? 'Élève' : 'Élèves'}</span>
              <span className="participants-group-count participants-group-count--student">
                {unmatchedStudents.length}
              </span>
            </div>
            <div className="participant-chip-list">
              {unmatchedStudents.map((student) => (
                <ParticipantChip
                  key={student.id}
                  user={{
                    firstName: student.user.firstName,
                    lastName: student.user.lastName,
                    displayName: student.user.displayName,
                    photoUrl: student.user.photoUrl,
                  }}
                  role="student"
                  levelId={student.user.userProfiles?.[0]?.levelId}
                  size="md"
                  showTooltip
                  attendanceStatus={(student.attendanceStatus as AttendanceStatus) || 'pending'}
                  absenceJustification={student.absenceJustification}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const renderSessionContent = (session: SessionWithParticipants): React.ReactNode => {
  const statusConfig = SESSION_STATUS_CONFIG[session.status] || SESSION_STATUS_CONFIG.PLANNED;
  const StatusIcon = statusConfig.icon;

  const typeConfig = SESSION_TYPE_CONFIG[session.type];
  const TypeIcon = typeConfig?.icon;

  const establishmentLabel = session.establishmentName ?? session.establishment?.name;

  const sessionDate = format(new Date(session.sessionDate), 'EEEE d MMMM yyyy', { locale: fr });
  const dayName = format(new Date(session.sessionDate), 'EEEE', { locale: fr });
  const dateFormatted = format(new Date(session.sessionDate), 'd MMMM yyyy', { locale: fr });

  const typeColorName = typeConfig?.colorName ?? 'color-2';

  const tutors = session.participants?.filter((p) => p.role === 'tutor') || [];
  const students = session.participants?.filter((p) => p.role === 'student') || [];
  const volunteers = session.participants?.filter((p) => p.role === 'volunteer') || [];
  const hasParticipants = tutors.length > 0 || students.length > 0;

  const countByStatus = countAttendanceByStatus(session.participants);
  const pairsByTutor = groupPairsByTutor(session);

  const matchedTutorIds = new Set(pairsByTutor.keys());
  const matchedStudentIds = new Set(session.studentTutorPairs?.map((p) => p.studentUserId) || []);

  const unmatchedTutors = tutors.filter((t) => !matchedTutorIds.has(t.userId));
  const unmatchedStudents = students.filter((s) => !matchedStudentIds.has(s.userId));
  const unmatchedVolunteers = volunteers.filter((v) => !matchedTutorIds.has(v.userId));

  const hasBinomes = pairsByTutor.size > 0;
  const hasActivityOrSubjects =
    session.activityName ||
    session.activity ||
    (session.subjectNames && session.subjectNames.length > 0) ||
    (session.levelNames && session.levelNames.length > 0);

  const showRemoteLink =
    session.joinLink && (session.sessionFormat === 'remote' || session.sessionFormat === 'hybrid');

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <Calendar className="w-7 h-7 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="text-2xl font-bold text-[var(--color-1-nuance-1)] capitalize">
                {dayName} {dateFormatted}
              </h3>
              <DetailBadge
                label={typeConfig?.label ?? session.type}
                icon={TypeIcon}
                colorName={typeColorName}
                variant="filled"
              />
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(session.status)}
                variant="outlined"
              />
              {establishmentLabel && (
                <DetailBadge
                  label={establishmentLabel}
                  icon={Building2}
                  colorName="color-1"
                  variant="outlined"
                />
              )}
            </div>
            {session.topic && (
              <p className="text-base text-[var(--color-1-nuance-2)]">{session.topic}</p>
            )}
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Clock} title="Date et heure" colorName="color-2" colSpan={1}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Date</p>
              <p className="text-base font-semibold text-foreground capitalize">{sessionDate}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Horaires</p>
              <div className="time-pill">
                <Clock className="w-4 h-4" />
                <span>
                  {session.startTime} - {session.endTime}
                </span>
              </div>
            </div>

            {Boolean(session.durationMinutes) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Durée</p>
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)] text-[var(--color-1-nuance-1)] border border-[var(--color-1-nuance-1)]">
                  {session.durationMinutes} minutes
                </span>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title="Lieu et format" colorName="color-1" colSpan={1}>
          <div className="space-y-4">
            {establishmentLabel && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Établissement</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[var(--color-1-nuance-1)]" />
                  <p className="text-base font-semibold text-foreground">{establishmentLabel}</p>
                </div>
              </div>
            )}

            {session.sessionFormat && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Format</p>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)] text-[var(--color-1-nuance-1)] border-2 border-[var(--color-1-nuance-1)]">
                  {getSessionFormatLabel(session.sessionFormat)}
                </span>
              </div>
            )}

            {showRemoteLink ? (
              <div>
                <a
                  href={session.joinLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-2-nuance-1)] text-white hover:opacity-90 transition-opacity"
                >
                  <Video className="w-4 h-4" />
                  Rejoindre la session
                </a>
              </div>
            ) : (
              (session.sessionFormat === 'remote' || session.sessionFormat === 'hybrid') && (
                <EmptyPlaceholder message="Aucun lien de visioconférence configuré" />
              )
            )}
          </div>
        </SectionCard>

        {session.mode === 'recurring' && (
          <SectionCard
            icon={Repeat2}
            title="Planification récurrente"
            colorName="color-2"
            colSpan={1}
          >
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Mode</p>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)] text-[var(--color-2-nuance-1)] border-2 border-[var(--color-2-nuance-1)]">
                  Récurrente
                </span>
              </div>

              {session.recurrenceType && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Type de récurrence
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {SESSION_RECURRENCE_LABELS[session.recurrenceType] || session.recurrenceType}
                  </p>
                </div>
              )}

              {session.recurrenceType === 'several_days_per_week' && session.recurrenceRule && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Jours de récurrence
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const weekDays =
                        ((session.recurrenceRule as any)?.weekDays as number[]) || [];
                      const dayLabels: Record<number, string> = {
                        1: 'Lundi',
                        2: 'Mardi',
                        3: 'Mercredi',
                        4: 'Jeudi',
                        5: 'Vendredi',
                        6: 'Samedi',
                        7: 'Dimanche',
                      };
                      return weekDays.map((day) => (
                        <span
                          key={day}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)] text-[var(--color-1-nuance-1)] border border-[var(--color-1-nuance-1)]"
                        >
                          {dayLabels[day] || `Jour ${day}`}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {session.recurrenceGroupId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Série</p>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)] text-[var(--color-2-nuance-1)] border border-[var(--color-2-nuance-1)]">
                    <Repeat2 className="w-3.5 h-3.5" />
                    Série récurrente
                  </span>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard
          icon={Tag}
          title="Activité, niveaux et matières"
          colorName="color-2"
          colSpan={1}
        >
          {hasActivityOrSubjects ? (
            <div className="space-y-4">
              {Boolean(session.activityName || session.activity) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Activité</p>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)] text-[var(--color-2-nuance-1)] border border-[var(--color-2-nuance-1)]">
                    {session.activityName || session.activity?.label}
                  </span>
                  {Boolean(session.activity?.maxStudents) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Maximum: {session.activity.maxStudents} élèves
                    </p>
                  )}
                </div>
              )}

              {session.levelNames && session.levelNames.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Niveaux</p>
                  <div className="flex flex-wrap gap-2">
                    {session.levelNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)] text-[var(--color-1-nuance-1)] border border-[var(--color-1-nuance-1)]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {session.subjectNames && session.subjectNames.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Matières</p>
                  <div className="flex flex-wrap gap-2">
                    {session.subjectNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)] text-[var(--color-3-nuance-1)] border border-[var(--color-3-nuance-1)]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyPlaceholder message="Aucune activité ou matière associée" />
          )}
        </SectionCard>

        <SectionCard icon={Users} title="Participants" colorName="color-3" colSpan="full">
          {hasParticipants ? (
            <div className="space-y-6">
              <AttendanceStatusBadges countByStatus={countByStatus} />
              <PairSection pairsByTutor={pairsByTutor} session={session} />
              <UnmatchedParticipantsSection
                unmatchedTutors={unmatchedTutors}
                unmatchedVolunteers={unmatchedVolunteers}
                unmatchedStudents={unmatchedStudents}
                hasBinomes={hasBinomes}
              />
            </div>
          ) : (
            <div className="empty-state">
              <Users className="w-10 h-10 text-muted-foreground opacity-40" />
              <p className="empty-state-text">Aucun participant pour le moment</p>
            </div>
          )}
        </SectionCard>

        <SectionCard icon={BookOpen} title="Notes internes" colorName="color-1" colSpan="full">
          {session.internalNotes ? (
            <div className="rounded-lg bg-[color-mix(in_srgb,var(--color-1-nuance-1)_5%,transparent)] p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {session.internalNotes}
              </p>
            </div>
          ) : (
            <EmptyPlaceholder message="Aucune note interne pour cette séance" />
          )}
        </SectionCard>
      </div>

      {session.createdAt && (
        <div className="mt-8 pt-4 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Créé le {new Date(session.createdAt).toLocaleDateString('fr-FR')}</span>
            {session.updatedAt && (
              <>
                <Minus className="w-3 h-3" />
                <span>Modifié le {new Date(session.updatedAt).toLocaleDateString('fr-FR')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
