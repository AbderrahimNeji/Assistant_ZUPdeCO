import * as React from 'react';
import {
  FileText,
  Calendar,
  User,
  Star,
  CheckCircle2,
  Building2,
  Minus,
  Users,
  BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DetailBadge } from '@/components/common/details/DetailBadge';
import { EmptyPlaceholder } from '@/components/common/details/EmptyPlaceholder';
import { DetailField } from '@/components/common/details/DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { ParticipantChip } from '@/components/sessions/ParticipantChip';
import { partitionParticipantsForReport } from '@/utils/report-participants';
import { REPORT_STATUS_CONFIG } from '@/components/reports/report-configs';
import { TutorReportSection } from '@/components/reports/TutorReportSection';
import { TutorFeedbackReadOnly } from '@/components/reports/TutorFeedbackFields';
import { ReportValidateWaitHint } from '@/components/reports/ReportValidateWaitHint';
import { Spinner } from '@/components/ui/spinner';
import { getSession } from '@/services/sessions.service';
import { getSubjects } from '@/services/academic.service';
import { parseReportSubjectField } from '@/utils/report-subject';
import { useConnectedUser } from '@/hooks/useConnectedUser';
import {
  buildTutorReportSections,
  getDisplayAuthorFeedback,
  isMultiAuthorReport,
  normalizeAuthorFeedbacks,
} from '@/utils/report-author-feedback';
import type { SessionReport } from '@/types/report.types';
import type { AttendanceStatus } from '@/types/attendance.types';
import type { SessionWithParticipants } from '@/types/session.types';

const PARTICIPANT_ROLE_ORDER: Record<'tutor' | 'volunteer' | 'student', number> = {
  tutor: 0,
  volunteer: 1,
  student: 2,
};

function ReportDetailLoader() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-16">
      <Spinner size="lg" label="Chargement du compte rendu…" />
    </div>
  );
}

interface ReportMatièresBlockProps {
  report: SessionReport;
  subjectsById: Map<string, string>;
}

const ReportMatièresBlock: React.FC<ReportMatièresBlockProps> = ({ report, subjectsById }) => {
  const p = report.subjectIds?.length
    ? { type: 'ids' as const, ids: report.subjectIds! }
    : parseReportSubjectField(report.subject);

  if (p.type === 'legacy') {
    if (!p.text) {
      return (
        <SectionCard icon={BookOpen} title="Matières" colorName="color-2" colSpan="full">
          <EmptyPlaceholder message="Aucune matière renseignée" />
        </SectionCard>
      );
    }
    return (
      <SectionCard icon={BookOpen} title="Matières" colorName="color-2" colSpan="full">
        <p className="text-sm text-foreground">{p.text}</p>
        <p className="text-xs text-muted-foreground mt-1">(ancien enregistrement texte libre)</p>
      </SectionCard>
    );
  }

  if (p.type === 'ids' && p.ids.length === 0) {
    return (
      <SectionCard icon={BookOpen} title="Matières" colorName="color-2" colSpan="full">
        <EmptyPlaceholder message="Aucune matière renseignée" />
      </SectionCard>
    );
  }

  return (
    <SectionCard icon={BookOpen} title="Matières" colorName="color-2" colSpan="full">
      <div className="flex flex-wrap gap-2">
        {p.ids.map((id) => (
          <span
            key={id}
            className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-0.5 text-sm text-foreground"
          >
            {subjectsById.get(id) ?? id}
          </span>
        ))}
      </div>
    </SectionCard>
  );
};

interface ReportPresencesBlockProps {
  session: SessionWithParticipants | undefined;
  isError: boolean;
}

const ReportPresencesBlock: React.FC<ReportPresencesBlockProps> = ({ session, isError }) => {
  if (isError) {
    return (
      <SectionCard icon={Users} title="Présences" colorName="color-3" colSpan="full">
        <EmptyPlaceholder message="Impossible de charger les participants" />
      </SectionCard>
    );
  }

  if (!session?.participants?.length) {
    return (
      <SectionCard icon={Users} title="Présences" colorName="color-3" colSpan="full">
        <EmptyPlaceholder message="Aucun participant pour cette séance" />
      </SectionCard>
    );
  }

  const { vscParticipants, attendanceParticipants } = partitionParticipantsForReport(
    session.participants,
  );

  const sortedAttendance = [...attendanceParticipants].sort(
    (a, b) =>
      PARTICIPANT_ROLE_ORDER[a.role as keyof typeof PARTICIPANT_ROLE_ORDER] -
      PARTICIPANT_ROLE_ORDER[b.role as keyof typeof PARTICIPANT_ROLE_ORDER],
  );

  return (
    <>
      {vscParticipants.length > 0 && (
        <SectionCard icon={Users} title="VSC" colorName="color-3" colSpan="full">
          <p className="text-sm text-muted-foreground mb-3">
            {vscParticipants.length === 1
              ? 'VSC présent sur la séance (hors saisie de présence dans ce compte rendu).'
              : 'VSC présents sur la séance (hors saisie de présence dans ce compte rendu).'}
          </p>
          <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
            {vscParticipants.map((p) => (
              <li key={p.id}>
                <ParticipantChip
                  user={p.user}
                  role="volunteer"
                  volunteerRoleLabel="VSC"
                  size="md"
                  showTooltip
                />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
      {attendanceParticipants.length > 0 ? (
        <SectionCard icon={Users} title="Présences" colorName="color-3" colSpan="full">
          <div className="rounded-lg border border-border bg-muted/25 p-4">
            <ul className="flex flex-col gap-3 list-none p-0 m-0">
              {sortedAttendance.map((p) => (
                <li key={p.id} className="flex items-start min-w-0">
                  <ParticipantChip
                    user={p.user}
                    role={p.role}
                    size="md"
                    showTooltip
                    showAbsenceMotifInline
                    attendanceStatus={(p.attendanceStatus || 'pending') as AttendanceStatus}
                    absenceJustification={p.absenceJustification ?? null}
                  />
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>
      ) : vscParticipants.length === 0 ? (
        <SectionCard icon={Users} title="Présences" colorName="color-3" colSpan="full">
          <EmptyPlaceholder message="Aucun participant pour cette séance" />
        </SectionCard>
      ) : null}
    </>
  );
};

export interface ReportDetailContentProps {
  report: SessionReport | null | undefined;
  /** Chargement du CR complet (ex. fetch hors page courante). */
  isReportLoading?: boolean;
}

export const ReportDetailContent: React.FC<ReportDetailContentProps> = ({
  report,
  isReportLoading = false,
}) => {
  const sessionId = report?.session?.id ?? report?.sessionId ?? '';
  const { user } = useConnectedUser();

  const sessionQuery = useQuery({
    queryKey: ['session', sessionId, 'report-detail'],
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId && !!report && !isReportLoading,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'report-detail'],
    queryFn: () => getSubjects({ page: 1, pageSize: 500 }),
    select: (r) => r.data,
    enabled: !!report && !isReportLoading,
  });

  const isDetailLoading =
    isReportLoading ||
    !report ||
    subjectsQuery.isLoading ||
    (!!sessionId && sessionQuery.isLoading);

  if (isDetailLoading) {
    return <ReportDetailLoader />;
  }

  if (sessionId && sessionQuery.isError) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center py-12">
        <EmptyPlaceholder message="Impossible de charger les données de la séance" />
      </div>
    );
  }

  const session = sessionQuery.data;
  const subjectsById = new Map((subjectsQuery.data ?? []).map((s) => [s.id, s.label]));

  const statusConfig = REPORT_STATUS_CONFIG[report.status] || REPORT_STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'validated' ? 'success' : 'error';
  };

  const authorName =
    report.author?.displayName ||
    [report.author?.firstName, report.author?.lastName].filter(Boolean).join(' ') ||
    report.authorName ||
    'Auteur inconnu';

  const validatorName = report.validatedBy
    ? [report.validatedBy.firstName, report.validatedBy.lastName].filter(Boolean).join(' ') ||
      'Validateur inconnu'
    : null;

  const sessionDate = report.session?.sessionDate
    ? format(new Date(report.session.sessionDate), 'EEEE d MMMM yyyy', { locale: fr })
    : null;

  const displayFeedback = getDisplayAuthorFeedback(report);
  const multiAuthor = isMultiAuthorReport(session, report);
  const sections = buildTutorReportSections(session, report);
  const feedbackCount = normalizeAuthorFeedbacks(report).length;
  const completedCount = normalizeAuthorFeedbacks(report).filter(
    (f) => f.rating != null && f.comment?.trim(),
  ).length;
  const singleSection = sections.length === 1 ? sections[0] : null;

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <FileText className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="text-2xl font-bold text-[var(--color-1-nuance-1)] capitalize">
                Compte-rendu de session
              </h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(report.status)}
                variant="filled"
              />
              {displayFeedback?.rating != null && displayFeedback.rating >= 4 && !multiAuthor && (
                <DetailBadge
                  label={`${displayFeedback.rating}/5 étoiles`}
                  icon={Star}
                  colorName="color-2"
                  variant="outlined"
                />
              )}
              {multiAuthor && feedbackCount > 0 && (
                <DetailBadge
                  label={`${completedCount}/${feedbackCount} évaluations`}
                  icon={Star}
                  colorName="color-2"
                  variant="outlined"
                />
              )}
            </div>
            {sessionDate && (
              <p className="text-base text-[var(--color-1-nuance-2)]">{sessionDate}</p>
            )}
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        {report.session && (
          <SectionCard icon={Calendar} title="Séance" colorName="color-2" colSpan={1}>
            <div className="space-y-2">
              <DetailField label="Date" value={sessionDate || '—'} />
              {report.session.establishment?.name && (
                <DetailField
                  icon={Building2}
                  label="Établissement"
                  value={report.session.establishment.name}
                />
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard icon={User} title="Auteur du CR" colorName="color-1" colSpan={1}>
          <DetailField label="Nom" value={authorName} />
        </SectionCard>

        <ReportMatièresBlock report={report} subjectsById={subjectsById} />

        <div className="col-span-full">
          <ReportValidateWaitHint
            report={report}
            session={sessionQuery.data}
            viewerUserId={user?.id}
          />
        </div>

        {multiAuthor && sections.length > 0 && (
          <>
            {sections.map((section) => (
              <TutorReportSection key={section.authorUserId} section={section} mode="read" />
            ))}
          </>
        )}

        {!multiAuthor && (singleSection || displayFeedback) && (
          <SectionCard icon={Star} title="Évaluation" colorName="color-3" colSpan="full">
            <TutorFeedbackReadOnly feedback={(singleSection?.feedback ?? displayFeedback)!} />
          </SectionCard>
        )}

        {sessionId && <ReportPresencesBlock session={session} isError={sessionQuery.isError} />}

        {report.status === 'validated' && validatorName && report.validatedAt && (
          <SectionCard icon={CheckCircle2} title="Validation" colorName="color-3" colSpan="full">
            <div className="space-y-2">
              <DetailField label="Validé par" value={validatorName} />
              <DetailField
                label="Date"
                value={format(new Date(report.validatedAt), 'd MMMM yyyy à HH:mm', { locale: fr })}
              />
            </div>
          </SectionCard>
        )}
      </div>

      {report.createdAt && (
        <div className="mt-8 pt-4 border-t border-[var(--color-1-nuance-3)]">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Créé le {new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
            {report.updatedAt && (
              <>
                <Minus className="w-3 h-3" />
                <span>Modifié le {new Date(report.updatedAt).toLocaleDateString('fr-FR')}</span>
              </>
            )}
            {report.version && (
              <>
                <Minus className="w-3 h-3" />
                <span>Version {report.version}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
