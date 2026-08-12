import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, In, SelectQueryBuilder, Brackets } from 'typeorm';
import { GamificationService } from '../gamification/gamification.service';
import { Session } from './entities/session.entity';
import { SessionConfig } from './entities/session-config.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { Assignment } from './entities/assignment.entity';
import { SessionReport, type SessionReportStatus } from './entities/session-report.entity';
import { SessionStatusHistory } from './entities/session-status-history.entity';
import type { StatusTransitionTriggerType } from './entities/session-status-history.entity';
import { SessionStudentTutorPair } from './entities/session-student-tutor-pair.entity';
import { BinomeCoeur } from './entities/binome-coeur.entity';
import { VscReport } from './entities/vsc-report.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { isAvailableForSession } from '../users/availability.utils';
import { profileHasSubject } from '../users/subjects.utils';
import type { AssignmentSource } from './entities/session-student-tutor-pair.entity';
import { BinomeCoeurService } from './binome-coeur.service';
import { parseLocalDate, parseLocalDateEndOfDay, toLocalDateString } from '../../common/utils/date-parser.utils';
import { formatExportDate } from '../../common/utils/format.utils';
import { buildXlsxBuffer } from '../../common/utils/excel-export.util';
import { getEffectiveStatus, isAllowedStoredTransition } from './session-status.transitions';
import { Activity } from '../activity/entities/activity.entity';
import { ActivityService } from '../activity/activity.service';
import * as ExcelJS from 'exceljs';
import { ActivityTypeService } from '../activity/activity-type.service';
import { SchoolYear } from '../academic/entities/school-year.entity';
import { Holiday } from '../academic/entities/holiday.entity';
import { VacationZone } from '../academic/entities/vacation-zone.entity';
import { RecurrenceType, SessionStatus, SessionType } from './entities/session.entity';
import { isGroupSessionType } from './session-types.constants';
import { AutoAssignmentProposalDto, ProposedPairDto } from './dto/auto-assignment-proposal.dto';
import { ProposeDraftAutoAssignmentDto } from './dto/propose-draft-auto-assignment.dto';
import { AuditLogService } from '../audit/audit.service';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';
import { CreateSessionDto } from './dto/create-session.dto';
import {
  deriveSessionPairsFromCreateInput,
  validatePairsForSessionType,
} from './session-pairs.utils';
import { userHasVolunteerRole } from './session-participant-rules.utils';
import { UpdateSessionDto } from './dto/update-session.dto';
import { RecurrenceUpdateScope } from './dto/recurrence-update-scope.enum';
import { CreateSessionParticipantDto } from './dto/create-session-participant.dto';
import { UpdateSessionParticipantDto } from './dto/update-session-participant.dto';
import { CreateSessionReportDto } from './dto/create-session-report.dto';
import { UpdateSessionReportDto } from './dto/update-session-report.dto';
import type { SessionReportAuthorFeedbackDto } from './dto/session-report-author-feedback.dto';
import {
  assertAuthorFeedbacksShape,
  buildAuthorFeedbackSkeleton,
  getDisplayAuthorFeedback,
  getNonStudentAuthorIds,
  hasActorFeedbackData,
  isActorFeedbackComplete,
  isPrivilegedSessionReportEditor,
  mergeAuthorFeedbackUpdate,
  type SessionReportAuthorFeedback,
} from './session-report-author-feedback';
import { SessionReportParticipantAttendanceItemDto } from './dto/session-report-participant-attendance.dto';
import { CreateVscReportDto } from './dto/create-vsc-report.dto';
import { UpdateVscReportDto } from './dto/update-vsc-report.dto';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { AttendanceHistoryQueryDto } from './dto/attendance-history-query.dto';
import { PutSessionConfigDto } from './dto/put-session-config.dto';
import {
  CancelSessionDematchMode,
  CancelSessionDto,
  CancelSessionReasonCode,
} from './dto/cancel-session.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response';
import { getSkipTake } from '../../common/dto/pagination.dto';
import type { PaginatedResponse } from '../../common/dto/paginated-response';
import { DateTime } from 'luxon';
import {
  dedupeRecurringSameCreatedStartSlot,
  getSessionStartDateTime,
  isSameCreationCalendarDayAsSessionDate,
  isSessionAtOrAfter,
  isStartInWindow,
  sessionDateToYmd,
  type SessionWithStart,
} from './session-report-job.utils';
import { Company } from '../companies/entities/company.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { Room } from '../companies/entities/room.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionalMailService } from '../mail/transactional-mail.service';
import { ListReportsQueryDto } from './dto/list-reports-query.dto';
import { VscDailyReportsService } from './vsc-daily-reports.service';

/** hh:mm from DB time string (HH:MM:SS or HH:MM). */
function formatExportTime(t: string | null | undefined): string {
  if (t == null || t === '') return '';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

const ATTENDANCE_LABELS: Record<string, string> = {
  present: 'Présent',
  absent: 'Absent',
  excused: 'Excusé',
  pending: 'En attente',
};

/** CR encore à saisir (coquille to_complete, brouillon, ou marqué en retard). */
const SESSION_REPORT_PENDING_SAISIE_STATUSES: SessionReportStatus[] = ['to_complete', 'draft', 'overdue'];

type ParticipantExportRole = 'student' | 'tutor' | 'volunteer';

function formatSessionParticipantsByRoles(session: Session, roles: ParticipantExportRole[]): string {
  const list =
    session.sessionParticipants?.filter((p) => roles.includes(p.role as ParticipantExportRole)) ?? [];
  if (!list.length) return '';
  return [...list]
    .sort((a, b) => {
      const na =
        a.user?.displayName?.trim() ||
        `${a.user?.firstName ?? ''} ${a.user?.lastName ?? ''}`.trim() ||
        a.user?.email ||
        a.userId;
      const nb =
        b.user?.displayName?.trim() ||
        `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim() ||
        b.user?.email ||
        b.userId;
      return na.localeCompare(nb);
    })
    .map((p) => {
      const u = p.user;
      const name =
        u?.displayName?.trim() ||
        `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() ||
        u?.email ||
        p.userId;
      const att = p.attendanceStatus
        ? ATTENDANCE_LABELS[p.attendanceStatus] ?? p.attendanceStatus
        : '';
      return att ? `${name} (${att})` : name;
    })
    .join('; ');
}

function formatReportValidatorDisplay(report: SessionReport): string {
  const denorm = report.validatedByName?.trim();
  if (denorm) return denorm;
  const u = report.validatedBy;
  if (!u) return '';
  return (
    u.displayName?.trim() ||
    `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() ||
    u.email?.trim() ||
    ''
  );
}

const VSC_REPORT_STATUS_FR: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  validated: 'Validé',
};

const VSC_REPORT_CATEGORY_FR: Record<string, string> = {
  daily: 'Journalier',
  weekly: 'Hebdomadaire',
};

function formatVscExportSessionLine(r: {
  sessionDisplayName?: string | null;
  session?: { sessionDate?: Date | string } | null;
}): string {
  const dn = r.sessionDisplayName?.trim();
  if (dn) return dn;
  const sd = r.session?.sessionDate;
  if (sd != null && sd !== '') {
    const formatted = formatExportDate(sd);
    if (formatted) return formatted;
  }
  return 'Date inconnue';
}

function formatVscExportCategoryLabel(category: string | null | undefined): string {
  if (category == null || category === '') return 'Manuel';
  return VSC_REPORT_CATEGORY_FR[category] ?? String(category);
}

function formatVscExportStatusLabel(status: string | null | undefined): string {
  if (status == null || status === '') return '';
  return VSC_REPORT_STATUS_FR[status] ?? String(status);
}

interface StatusTransitionMetadata {
  reasonCode?: string | null;
  reasonDetail?: string | null;
  dematchMode?: string | null;
  removedPairsCount?: number | null;
}

export interface CancelSessionResult {
  session: Session;
  removedPairsCount: number;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  /** Seuil lu une fois au démarrage : `STUDENT_ACCOMPANIED_MIN_PRESENT_SESSIONS` (défaut 3). */
  private readonly studentAccompaniedMinPresent: number;

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionConfig)
    private readonly sessionConfigRepository: Repository<SessionConfig>,
    @InjectRepository(SessionParticipant)
    private readonly participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(SessionReport)
    private readonly sessionReportRepository: Repository<SessionReport>,
    @InjectRepository(SessionStatusHistory)
    private readonly sessionStatusHistoryRepository: Repository<SessionStatusHistory>,
    @InjectRepository(SessionStudentTutorPair)
    private readonly studentTutorPairRepository: Repository<SessionStudentTutorPair>,
    @InjectRepository(BinomeCoeur)
    private readonly binomeCoeurRepository: Repository<BinomeCoeur>,
    @InjectRepository(VscReport)
    private readonly vscReportRepository: Repository<VscReport>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(SchoolYear)
    private readonly schoolYearRepository: Repository<SchoolYear>,
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
    @InjectRepository(VacationZone)
    private readonly vacationZoneRepository: Repository<VacationZone>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly auditLogService: AuditLogService,
    private readonly usersService: UsersService,
    private readonly binomeCoeurService: BinomeCoeurService,
    private readonly activityService: ActivityService,
    private readonly activityTypeService: ActivityTypeService,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
    private readonly notifications: NotificationsService,
    private readonly transactionalMail: TransactionalMailService,
    private readonly vscDailyReportsService: VscDailyReportsService,
    private readonly gamificationService: GamificationService,
  ) {
    this.studentAccompaniedMinPresent = SessionsService.parseStudentAccompaniedMinPresentFromEnv();
  }

  private static parseStudentAccompaniedMinPresentFromEnv(): number {
    const raw = process.env.STUDENT_ACCOMPANIED_MIN_PRESENT_SESSIONS;
    if (raw == null || String(raw).trim() === '') return 3;
    const n = Number.parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(n) || n < 0) return 3;
    return n;
  }

  private async findOneSession(id: string, companyId: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id, companyId },
      relations: ['establishment'],
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  /**
   * Some clients still expect `session.subject.label`; the entity stores denormalized
   * `subjectNames` (jsonb) instead of a Subject relation.
   */
  private applySessionSubjectLabelCompat(session: Session): void {
    const names = session.subjectNames?.filter((n): n is string => Boolean(n?.trim()));
    if (!names?.length) return;
    (session as Session & { subject?: { label: string } }).subject = {
      label: names.join(', '),
    };
  }

  private hasRole(roleCodes: string[] | undefined, ...expected: string[]): boolean {
    if (!roleCodes?.length) return false;
    const upper = new Set(roleCodes.map((code) => (code ?? '').toUpperCase()));
    return expected.some((role) => upper.has(role.toUpperCase()));
  }

  private async isUserTutorOrVolunteerOnSession(sessionId: string, userId: string): Promise<boolean> {
    const n = await this.participantRepository.count({
      where: { sessionId, userId, role: In(['tutor', 'volunteer']) },
    });
    return n > 0;
  }

  /**
   * Awards `cr_soumis` XP once when the report first becomes `submitted`, to the acting participant.
   */
  private async maybeAwardCrFirstSubmitXpOnSubmitted(params: {
    sessionId: string;
    companyId: string;
    reportId: string;
    previousStatus: SessionReport['status'];
    newStatus: SessionReport['status'];
    actorId?: string | null;
  }): Promise<void> {
    const { sessionId, companyId, reportId, previousStatus, newStatus, actorId } = params;
    if (!actorId) return;
    const becameSubmitted =
      newStatus === 'submitted' &&
      previousStatus !== 'submitted' &&
      previousStatus !== 'validated';
    if (!becameSubmitted) return;
    const eligible = await this.isUserTutorOrVolunteerOnSession(sessionId, actorId);
    if (!eligible) return;
    await this.gamificationService.tryAwardCrFirstSubmitXp({
      companyId,
      sessionId,
      reportId,
      userId: actorId,
    });
  }

  /**
   * Ensures the current user may access the session. If not, throws ForbiddenException.
   * Call after confirming the session exists (companyId + sessionId).
   */
  async assertSessionAccess(
    sessionId: string,
    companyId: string,
    userId: string,
    _roleCodes: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<void> {
    // Apply the same visibility scope as the list view to ensure consistent access control.
    // If no scope is provided or scope is unrestricted, only verify company ownership.
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('session.company_id = :companyId', { companyId });

    // Apply visibility scope if present (same logic as findAll)
    if (visibilityScope !== undefined && visibilityScope !== null) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'sessions',
        { userId, companyId },
      );
    }

    const session = await qb.getOne();
    if (!session) {
      throw new ForbiddenException('You do not have access to this session');
    }
  }

  /** Record a status transition in history (called only for stored transitions). */
  async recordStatusTransition(
    sessionId: string,
    fromStatus: SessionStatus,
    toStatus: SessionStatus,
    triggerType: StatusTransitionTriggerType,
    actorId?: string | null,
    metadata?: StatusTransitionMetadata,
  ): Promise<void> {
    const row = this.sessionStatusHistoryRepository.create({
      sessionId,
      fromStatus,
      toStatus,
      triggerType,
      actorId: actorId ?? null,
      reasonCode: metadata?.reasonCode ?? null,
      reasonDetail: metadata?.reasonDetail ?? null,
      dematchMode: metadata?.dematchMode ?? null,
      removedPairsCount: metadata?.removedPairsCount ?? null,
    });
    await this.sessionStatusHistoryRepository.save(row);
  }

  /** Apply a stored status transition: validate, update session, record history. */
  async applySessionStatusTransition(
    session: Session,
    newStatus: SessionStatus,
    triggerType: StatusTransitionTriggerType,
    actorId?: string | null,
    metadata?: StatusTransitionMetadata,
  ): Promise<Session> {
    const fromStatus = session.status;
    if (!isAllowedStoredTransition(fromStatus, newStatus, triggerType)) {
      throw new BadRequestException(
        `Transition ${fromStatus} → ${newStatus} with trigger "${triggerType}" is not allowed`,
      );
    }
    session.status = newStatus;
    const saved = await this.sessionRepository.save(session);
    await this.recordStatusTransition(
      session.id,
      fromStatus,
      newStatus,
      triggerType,
      actorId,
      metadata,
    );
    
    // Si transition vers IN_PROGRESS, créer automatiquement le CR si inexistant
    if (newStatus === SessionStatus.IN_PROGRESS) {
      const existingReport = await this.sessionReportRepository.findOne({
        where: { sessionId: session.id, companyId: saved.companyId }
      });
      
      if (!existingReport) {
        // Déterminer l'auteur du CR (prioriser managedBy, puis actorId, puis createdBy)
        const authorId = saved.managedById || actorId || saved.createdById;
        
        if (authorId) {
          // Créer le CR avec statut to_complete
          const sessionDateStr = toLocalDateString(saved.sessionDate);
          
          const authorFeedbacks = await this.emptyAuthorFeedbacksForSession(saved, authorId);
          const report = this.sessionReportRepository.create({
            sessionId: saved.id,
            companyId: saved.companyId,
            authorId,
            authorFeedbacks,
            status: 'to_complete',
            sessionDisplayName: `${sessionDateStr} - ${saved.startTime}`,
            toCompleteSince: new Date(),
          });
          await this.sessionReportRepository.save(report);
        }
      }
    }

    if (newStatus === SessionStatus.CANCELLED) {
      await this.deleteToCompleteReportsForSession(saved.id, saved.companyId);
      await this.vscDailyReportsService.reconcileAfterSessionChange(saved);
    }

    return saved;
  }

  /**
   * Emits `VSC_DAILY_REPORT_AVAILABLE` once per (establishment, calendar day in Europe/Paris)
   * when the first session of the day for an establishment transitions to CLOSED.
   * Recipients: VSC users of the company with `vsc_reports_frequencies.daily = true`.
   */
  private async notifyVscOnFirstClosedSessionOfDay(session: Session): Promise<void> {
    try {
      if (!session.establishmentId) return;
      const zone = await this.getCompanyTimezone(session.companyId);
      const dayKey = DateTime.now().setZone(zone).toISODate();
      if (!dayKey) return;

      // Is there already another CLOSED session today (Paris tz) for this establishment?
      const earlierCount = await this.sessionRepository
        .createQueryBuilder('s')
        .where('s.company_id = :companyId', { companyId: session.companyId })
        .andWhere('s.establishment_id = :establishmentId', {
          establishmentId: session.establishmentId,
        })
        .andWhere('s.status = :closed', { closed: SessionStatus.CLOSED })
        .andWhere('s.id <> :id', { id: session.id })
        .andWhere(
          `to_char(s.updated_at AT TIME ZONE :zone, 'YYYY-MM-DD') = :day`,
          { zone, day: dayKey },
        )
        .getCount();

      if (earlierCount > 0) return;

      // Establishment display name for the message body.
      const establishment = await this.establishmentRepository.findOne({
        where: { id: session.establishmentId },
      });
      const establishmentName =
        establishment?.name ?? session.establishmentName ?? '';

      const vscProfiles = await this.userProfileRepository
        .createQueryBuilder('up')
        .innerJoinAndSelect('up.user', 'user')
        .innerJoinAndSelect('user.userRoles', 'userRoles')
        .innerJoinAndSelect('userRoles.role', 'role')
        .where('user.company_id = :companyId', { companyId: session.companyId })
        .andWhere('role.code = :roleCode', { roleCode: 'volunteer' })
        .andWhere("(up.vsc_reports_frequencies->>'daily')::boolean = true")
        .andWhere('user.status = :status', { status: 'active' })
        .getMany();

      if (vscProfiles.length === 0) return;

      const dedupeKey = `est:${session.establishmentId}:day:${dayKey}`;
      await Promise.all(
        vscProfiles.map(async (profile) => {
          const created = await this.notifications.createIfNotDuplicate({
            companyId: session.companyId,
            userId: profile.user.id,
            type: 'VSC_DAILY_REPORT_AVAILABLE',
            title: 'Rapport VSC journalier disponible',
            body: establishmentName
              ? `La première séance de la journée à "${establishmentName}" est finalisée. Votre rapport VSC journalier peut maintenant être saisi.`
              : 'La première séance de la journée est finalisée. Votre rapport VSC journalier peut maintenant être saisi.',
            payload: {
              establishmentId: session.establishmentId,
              sessionId: session.id,
              date: dayKey,
            },
            dedupeKey,
          });
          if (!created) return;
          const email = profile.user.email?.trim();
          if (!email) return;
          await this.transactionalMail
            .sendVscDailyReportAvailable({
              companyId: session.companyId,
              establishmentId: session.establishmentId,
              recipientEmail: email,
              dayKeyIso: dayKey,
            })
            .catch((err) =>
              this.logger.warn(
                `VSC daily report mail failed user=${profile.user.id}: ${(err as Error).message}`,
              ),
            );
        }),
      );
    } catch (err) {
      this.logger.warn(
        `notifyVscOnFirstClosedSessionOfDay failed for session=${session.id}: ${(err as Error).message}`,
      );
    }
  }

  /** Removes pre-session CR shells when a session is cancelled (only `to_complete`). */
  private async deleteToCompleteReportsForSession(sessionId: string, companyId: string): Promise<void> {
    await this.sessionReportRepository.delete({
      sessionId,
      companyId,
      status: 'to_complete',
    });
  }

  /**
   * Cron job (22:00 Europe/Paris): pre-create `session_reports` in `to_complete` for every PLANNED
   * session scheduled for the following calendar day. Idempotent: skips sessions that already have
   * a report (unique constraint + double-check guard against concurrent executions).
   */
  async ensureUpcomingSessionReportsFromJob(): Promise<{ created: number; skippedNoAuthor: number }> {
    const tomorrowYmd = DateTime.now().setZone('Europe/Paris').plus({ days: 1 }).toISODate()!;

    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.company', 'company')
      .where('session.status = :status', { status: SessionStatus.PLANNED })
      .andWhere('session.session_date = :date', { date: tomorrowYmd })
      .getMany();

    if (sessions.length === 0) {
      return { created: 0, skippedNoAuthor: 0 };
    }

    const sessionIds = sessions.map((s) => s.id);
    const existingRows = await this.sessionReportRepository.find({
      where: { sessionId: In(sessionIds) },
      select: ['sessionId'],
    });
    const sessionIdsWithReport = new Set(existingRows.map((r) => r.sessionId));

    let created = 0;
    let skippedNoAuthor = 0;

    for (const session of sessions) {
      if (sessionIdsWithReport.has(session.id)) continue;

      const authorId = session.managedById ?? session.createdById;
      if (!authorId) {
        this.logger.warn(
          `ensureUpcomingSessionReportsFromJob: skip session ${session.id} (no managedById or createdById)`,
        );
        skippedNoAuthor += 1;
        continue;
      }
      const stillThere = await this.sessionReportRepository.findOne({
        where: { sessionId: session.id, companyId: session.companyId },
      });
      if (stillThere) continue;

      const sessionDateStr = toLocalDateString(session.sessionDate);
      const authorFeedbacks = await this.emptyAuthorFeedbacksForSession(session, authorId);
      const report = this.sessionReportRepository.create({
        sessionId: session.id,
        companyId: session.companyId,
        authorId,
        authorFeedbacks,
        status: 'to_complete',
        sessionDisplayName: `${sessionDateStr} - ${session.startTime}`,
        toCompleteSince: new Date(),
      });
      await this.sessionReportRepository.save(report);
      created += 1;
    }

    return { created, skippedNoAuthor };
  }

  private async getCompanyTimezone(companyId: string): Promise<string> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      select: ['timezone'],
    });
    return company?.timezone?.trim() || 'Europe/Paris';
  }

  /**
   * When a session is saved at creation time: create a `to_complete` report only if the session's
   * `session_date` (civil day) equals the creation day in the company timezone
   * (`isSameCreationCalendarDayAsSessionDate`).
   * Recurring series: callers should invoke this only for the first occurrence (see `create` loop).
   * Idempotent if a report already exists (unique + job race).
   */
  private async maybeCreateInitialSessionReportOnCreate(
    session: Session,
    companyTimezone: string,
  ): Promise<void> {
    if (session.status !== SessionStatus.PLANNED) return;
    const authorId = session.managedById ?? session.createdById;
    if (!authorId) return;

    const existing = await this.sessionReportRepository.findOne({
      where: { sessionId: session.id, companyId: session.companyId },
    });
    if (existing) return;

    const zone = companyTimezone?.trim() || 'Europe/Paris';
    const createdInZone = DateTime.fromJSDate(session.createdAt, { zone: 'utc' }).setZone(zone);
    if (!isSameCreationCalendarDayAsSessionDate(createdInZone, session.sessionDate)) return;

    try {
      const sessionDateStr =
        session.sessionDate instanceof Date
          ? session.sessionDate.toISOString().slice(0, 10)
          : String(session.sessionDate).slice(0, 10);
      const authorFeedbacks = await this.emptyAuthorFeedbacksForSession(session, authorId);
      const report = this.sessionReportRepository.create({
        sessionId: session.id,
        companyId: session.companyId,
        authorId,
        authorFeedbacks,
        status: 'to_complete',
        sessionDisplayName: `${sessionDateStr} - ${session.startTime}`,
        toCompleteSince: new Date(),
      });
      await this.sessionReportRepository.save(report);
    } catch (err) {
      this.logger.warn(
        `maybeCreateInitialSessionReportOnCreate: failed for session ${session.id}: ${(err as Error).message}`,
      );
    }
  }

  /** Check for room double-booking: same room, same date, overlapping time. Excludes cancelled/closed. */
  private async checkRoomDoubleBooking(
    companyId: string,
    roomId: string | null,
    sessionDate: string | Date,
    startTime: string,
    endTime: string,
    excludeSessionId: string | null,
  ): Promise<void> {
    if (!roomId) return;
    const dateStr = typeof sessionDate === 'string' ? sessionDate : (sessionDate as Date).toISOString().slice(0, 10);
    const qb = this.sessionRepository
      .createQueryBuilder('s')
      .where('s.company_id = :companyId', { companyId })
      .andWhere('s.room_id = :roomId', { roomId })
      .andWhere('s.session_date = :dateStr', { dateStr })
      .andWhere('s.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [SessionStatus.CANCELLED, SessionStatus.CLOSED],
      })
      .andWhere('s.start_time < :endTime', { endTime })
      .andWhere('s.end_time > :startTime', { startTime });
    if (excludeSessionId) {
      qb.andWhere('s.id != :excludeSessionId', { excludeSessionId });
    }
    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        `Room is already booked for another session at this date/time`,
      );
    }
  }

  /**
   * Public method: check whether a given user (tutor/volunteer participant) already
   * has a session on the same date with an overlapping time slot.
   * Returns the conflicting session when found, or null.
   */
  async checkTutorParticipantConflict(
    companyId: string,
    tutorId: string,
    sessionDate: string,
    startTime: string,
    endTime: string,
    excludeSessionId?: string | null,
  ): Promise<{ id: string; sessionDate: string; startTime: string; endTime: string } | null> {
    const qb = this.participantRepository
      .createQueryBuilder('sp')
      .innerJoin('sp.session', 's')
      .where('s.company_id = :companyId', { companyId })
      .andWhere('sp.user_id = :tutorId', { tutorId })
      .andWhere('sp.role IN (:...tutorRoles)', { tutorRoles: ['tutor', 'volunteer'] })
      .andWhere('s.session_date = :sessionDate', { sessionDate })
      .andWhere('s.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [SessionStatus.CANCELLED, SessionStatus.CLOSED],
      })
      .andWhere('s.start_time < :endTime', { endTime })
      .andWhere('s.end_time > :startTime', { startTime })
      .select('sp.session_id', 'sessionId')
      .addSelect('s.id', 'id')
      .addSelect('s.session_date', 'sessionDate')
      .addSelect('s.start_time', 'startTime')
      .addSelect('s.end_time', 'endTime');

    if (excludeSessionId) {
      qb.andWhere('s.id != :excludeSessionId', { excludeSessionId });
    }

    const result = await qb.getRawOne<{
      id: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
    }>();

    if (!result) return null;

    return {
      id: result.id,
      sessionDate: result.sessionDate,
      startTime: result.startTime,
      endTime: result.endTime,
    };
  }

  /** Check for tutor (managedBy) double-booking: same user, same date, overlapping time. */
  private async checkTutorDoubleBooking(
    companyId: string,
    managedById: string | null,
    sessionDate: string | Date,
    startTime: string,
    endTime: string,
    excludeSessionId: string | null,
  ): Promise<void> {
    if (!managedById) return;
    const dateStr = typeof sessionDate === 'string' ? sessionDate : (sessionDate as Date).toISOString().slice(0, 10);
    const qb = this.sessionRepository
      .createQueryBuilder('s')
      .where('s.company_id = :companyId', { companyId })
      .andWhere('s.managed_by = :managedById', { managedById })
      .andWhere('s.session_date = :dateStr', { dateStr })
      .andWhere('s.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [SessionStatus.CANCELLED, SessionStatus.CLOSED],
      })
      .andWhere('s.start_time < :endTime', { endTime })
      .andWhere('s.end_time > :startTime', { startTime });
    if (excludeSessionId) {
      qb.andWhere('s.id != :excludeSessionId', { excludeSessionId });
    }
    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        `Tutor is already assigned to another session at this date/time`,
      );
    }
  }

  /**
   * Public check: returns whether a tutor already has a session at the given date/time slot.
   * Unlike checkTutorDoubleBooking, this does NOT throw — it returns a result object
   * so the caller (e.g. drag & drop UI) can display a warning without aborting.
   */
  async checkTutorConflict(
    companyId: string,
    tutorId: string,
    sessionDate: string,
    startTime: string,
    endTime: string,
    excludeSessionId?: string | null,
  ): Promise<{
    hasConflict: boolean;
    conflictingSession?: { id: string; sessionDate: string; startTime: string; endTime: string };
  }> {
    const qb = this.sessionRepository
      .createQueryBuilder('s')
      .select(['s.id', 's.session_date', 's.start_time', 's.end_time'])
      .where('s.company_id = :companyId', { companyId })
      .andWhere('s.managed_by = :tutorId', { tutorId })
      .andWhere('s.session_date = :sessionDate', { sessionDate })
      .andWhere('s.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [SessionStatus.CANCELLED, SessionStatus.CLOSED],
      })
      .andWhere('s.start_time < :endTime', { endTime })
      .andWhere('s.end_time > :startTime', { startTime });

    if (excludeSessionId) {
      qb.andWhere('s.id != :excludeSessionId', { excludeSessionId });
    }

    const existing = await qb.getOne();

    if (!existing) {
      return { hasConflict: false };
    }

    return {
      hasConflict: true,
      conflictingSession: {
        id: existing.id,
        sessionDate: typeof existing.sessionDate === 'string'
          ? existing.sessionDate
          : (existing.sessionDate as Date).toISOString().slice(0, 10),
        startTime: existing.startTime,
        endTime: existing.endTime,
      },
    };
  }

  /** Ensures optional vacation zone id belongs to the company (for holiday filtering). */
  private async assertVacationZoneBelongsToCompany(
    companyId: string,
    vacationZoneId: string | null | undefined,
  ): Promise<void> {
    if (!vacationZoneId) return;
    const z = await this.vacationZoneRepository.findOne({
      where: { id: vacationZoneId, companyId },
    });
    if (!z) {
      throw new BadRequestException('vacationZoneId does not match a vacation zone for this company');
    }
  }

  /**
   * Holidays overlapping [minYmd, maxYmd] for the company.
   * When `matchEstablishment` is true (default): same rules as calendar — global holidays or same establishment.
   * When false: any holiday row for the company (used to exclude recurring occurrences on any company vacation day).
   */
  private async findApplicableHolidaysForSessionRange(
    companyId: string,
    establishmentId: string,
    minYmd: string,
    maxYmd: string,
    vacationZoneId?: string | null,
    matchEstablishment = true,
  ): Promise<Holiday[]> {
    const qb = this.holidayRepository
      .createQueryBuilder('holiday')
      .where('holiday.companyId = :companyId', { companyId })
      .andWhere('holiday.deletedAt IS NULL')
      .andWhere('holiday.startDate <= :max', { max: maxYmd })
      .andWhere('holiday.endDate >= :min', { min: minYmd });
    if (matchEstablishment) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('holiday.establishmentId IS NULL').orWhere('holiday.establishmentId = :estId', {
            estId: establishmentId,
          });
        }),
      );
    }
    if (vacationZoneId) {
      qb.andWhere(
        new Brackets((q) => {
          q.where('holiday.vacationZoneId IS NULL').orWhere('holiday.vacationZoneId = :vzId', {
            vzId: vacationZoneId,
          });
        }),
      );
    }
    return qb.getMany();
  }

  private isYmdCoveredByHoliday(ymd: string, holiday: Holiday): boolean {
    const start = sessionDateToYmd(holiday.startDate);
    const end = sessionDateToYmd(holiday.endDate);
    return ymd >= start && ymd <= end;
  }

  private findFirstHolidayCoveringYmd(ymd: string, holidays: Holiday[]): Holiday | undefined {
    return holidays.find((h) => this.isYmdCoveredByHoliday(ymd, h));
  }

  /**
   * When `planDuringHolidays` is false, rejects civil dates covered by an applicable `holidays` row
   * (same company; establishment-wide or matching session establishment; optional zone filter aligned with calendar).
   */
  private async assertSessionDatesNotBlockedByHolidays(
    planDuringHolidays: boolean,
    companyId: string,
    establishmentId: string,
    civilDates: string[],
    vacationZoneId?: string | null,
  ): Promise<void> {
    if (planDuringHolidays) return;
    const unique = [...new Set(civilDates.filter(Boolean))].sort();
    if (unique.length === 0) return;
    await this.assertVacationZoneBelongsToCompany(companyId, vacationZoneId);

    const min = unique[0];
    const max = unique[unique.length - 1];
    const holidays = await this.findApplicableHolidaysForSessionRange(
      companyId,
      establishmentId,
      min,
      max,
      vacationZoneId,
      true,
    );

    for (const ymd of unique) {
      const h = this.findFirstHolidayCoveringYmd(ymd, holidays);
      if (h) {
        const start = sessionDateToYmd(h.startDate);
        const end = sessionDateToYmd(h.endDate);
        throw new BadRequestException(
          `La date ${ymd} chevauche la période « ${h.name} » (${start} – ${end}). Définissez planDuringHolidays à true pour autoriser la planification pendant les vacances ou jours fériés.`,
        );
      }
    }
  }

  /**
   * For recurring series with `planDuringHolidays` false: drop occurrence dates that fall on applicable holidays;
   * keeps order of remaining dates. Does nothing when `planDuringHolidays` is true.
   */
  private async filterOccurrenceDatesExcludingHolidays(
    planDuringHolidays: boolean,
    companyId: string,
    establishmentId: string,
    occurrenceDates: Date[],
    vacationZoneId?: string | null,
  ): Promise<Date[]> {
    if (planDuringHolidays || occurrenceDates.length === 0) return occurrenceDates;
    await this.assertVacationZoneBelongsToCompany(companyId, vacationZoneId);
    const ymds = occurrenceDates.map((d) => d.toISOString().slice(0, 10));
    const min = [...ymds].sort()[0];
    const max = [...ymds].sort()[ymds.length - 1];
    const holidays = await this.findApplicableHolidaysForSessionRange(
      companyId,
      establishmentId,
      min,
      max,
      vacationZoneId,
      false,
    );
    return occurrenceDates.filter((d) => {
      const ymd = d.toISOString().slice(0, 10);
      return !this.findFirstHolidayCoveringYmd(ymd, holidays);
    });
  }

  /** Normalize to date-only (noon UTC) to avoid timezone issues when comparing. */
  private toDateOnly(d: Date): Date {
    const s = d.toISOString().slice(0, 10);
    return new Date(s + 'T12:00:00.000Z');
  }

  /**
   * Same as `toDateOnly` but uses local calendar Y-M-D (via `toLocalDateString`), not UTC from `toISOString`.
   * Use for recurrence `ab` so the chosen session day matches civil dates when Node TZ is ahead of UTC.
   */
  private toDateOnlyLocal(d: Date): Date {
    const s = toLocalDateString(d);
    return new Date(s + 'T12:00:00.000Z');
  }

  /**
   * Generate occurrence dates for recurring sessions until effectiveEnd (capped by school year end).
   */
  private generateOccurrenceDates(
    startDate: Date,
    recurrenceType: RecurrenceType,
    recurrenceRule: Record<string, unknown> | null | undefined,
    schoolYearEndDate: Date,
  ): Date[] {
    const normalize = (date: Date) => this.toDateOnlyLocal(date);
    const start = normalize(new Date(startDate));
    const effectiveEnd = normalize(new Date(schoolYearEndDate));
    if (start > effectiveEnd) return [];

    const dates: Date[] = [];
    const addDate = (d: Date) => {
      const day = normalize(d);
      if (day <= effectiveEnd) dates.push(day);
    };

    if (recurrenceType === 'daily') {
      for (let d = new Date(start); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
        addDate(new Date(d));
      }
      return dates;
    }

    if (recurrenceType === 'weekly') {
      for (let d = new Date(start); d <= effectiveEnd; d.setDate(d.getDate() + 7)) {
        addDate(new Date(d));
      }
      return dates;
    }

    if (recurrenceType === 'biweekly') {
      for (let d = new Date(start); d <= effectiveEnd; d.setDate(d.getDate() + 14)) {
        addDate(new Date(d));
      }
      return dates;
    }

    if (recurrenceType === 'ab') {
      for (let d = new Date(start); d <= effectiveEnd; d.setDate(d.getDate() + 14)) {
        addDate(new Date(d));
      }
      return dates;
    }

    if (recurrenceType === 'several_days_per_week') {
      const weekDays = (recurrenceRule?.weekDays as number[]) ?? [start.getDay() || 7];
      for (let t = new Date(start); t <= effectiveEnd; t.setDate(t.getDate() + 1)) {
        const day = t.getDay() || 7;
        if (weekDays.includes(day)) addDate(new Date(t));
      }
      return dates;
    }

    if (recurrenceType === 'monthly') {
      const dayOfMonth = start.getDate();
      for (let d = new Date(start); d <= effectiveEnd; ) {
        addDate(new Date(d));
        d.setMonth(d.getMonth() + 1);
        if (d.getDate() !== dayOfMonth) d.setDate(Math.min(dayOfMonth, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
      }
      return dates;
    }

    if (recurrenceType === 'custom' && recurrenceRule) {
      const interval = (recurrenceRule.interval as number) ?? 1;
      const unit = (recurrenceRule.intervalUnit as string) ?? 'weeks';
      const endCondition = recurrenceRule.endCondition as string;
      const endAfterOccurrences = recurrenceRule.endAfterOccurrences as number | undefined;
      const endUntilDateStr = recurrenceRule.endUntilDate as string | undefined;
      let userEnd = effectiveEnd;
      if (endUntilDateStr) {
        const userEndDate = this.toDateOnly(new Date(endUntilDateStr));
        userEnd = userEndDate < effectiveEnd ? userEndDate : effectiveEnd;
      }
      let count = 0;
      for (let d = new Date(start); d <= userEnd; ) {
        addDate(new Date(d));
        count++;
        if (endCondition === 'after_occurrences' && endAfterOccurrences != null && count >= endAfterOccurrences) break;
        if (unit === 'days') d.setDate(d.getDate() + interval);
        else if (unit === 'weeks') d.setDate(d.getDate() + 7 * interval);
        else if (unit === 'months') d.setMonth(d.getMonth() + interval);
        else d.setDate(d.getDate() + 7 * interval);
      }
      return dates;
    }

    if (recurrenceType === 'once' || recurrenceType === 'none') {
      addDate(new Date(start));
      return dates;
    }

    addDate(new Date(start));
    return dates;
  }

  private async createParticipantsForSession(
    sessionId: string,
    tutorIds: string[] = [],
    studentIds: string[] = [],
    volunteerIds: string[] = [],
  ): Promise<void> {
    const toCreate: { sessionId: string; userId: string; role: 'tutor' | 'student' | 'volunteer' }[] = [];
    tutorIds.forEach((userId) => toCreate.push({ sessionId, userId, role: 'tutor' }));
    studentIds.forEach((userId) => toCreate.push({ sessionId, userId, role: 'student' }));
    volunteerIds.forEach((userId) => toCreate.push({ sessionId, userId, role: 'volunteer' }));
    for (const p of toCreate) {
      const participant = this.participantRepository.create({
        sessionId: p.sessionId,
        userId: p.userId,
        role: p.role,
        attendanceStatus: 'absent',
      });
      await this.participantRepository.save(participant);
    }
  }

  private buildParticipantsFromCreateDto(dto: CreateSessionDto): {
    userId: string;
    role: 'student' | 'tutor' | 'volunteer';
  }[] {
    const participants: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[] = [];
    (dto.tutorIds ?? []).forEach((userId) => participants.push({ userId, role: 'tutor' }));
    (dto.studentIds ?? []).forEach((userId) => participants.push({ userId, role: 'student' }));
    (dto.volunteerIds ?? []).forEach((userId) => participants.push({ userId, role: 'volunteer' }));
    return participants;
  }

  private async resolveVolunteerUserIds(
    companyId: string,
    userIds: string[],
  ): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const users = await this.userRepository.find({
      where: { id: In(userIds), companyId },
      relations: ['userRoles', 'userRoles.role'],
    });
    const volunteerIds = new Set<string>();
    for (const user of users) {
      if (userHasVolunteerRole(user)) volunteerIds.add(user.id);
    }
    return volunteerIds;
  }

  private async assertSessionParticipantRules(
    companyId: string,
    sessionType: SessionType,
    tutorIds: string[],
    studentIds: string[],
    volunteerIds: string[],
    explicitPairs?: { studentUserId: string; tutorUserId: string }[],
  ): Promise<void> {
    const facilitatorIds = [...new Set([...tutorIds, ...volunteerIds])];
    if (facilitatorIds.length < 1) {
      throw new BadRequestException(
        'Chaque séance doit comporter au moins un tuteur ou un VSC.',
      );
    }

    const pairs = deriveSessionPairsFromCreateInput(
      sessionType,
      tutorIds,
      studentIds,
      explicitPairs,
    );

    if (isGroupSessionType(sessionType)) {
      if (studentIds.length < 1) {
        throw new BadRequestException(
          'Une séance de groupe doit comporter au moins un élève. Les VSC sans élève assigné doivent être ajoutés comme participants (bénévoles) sur les séances des autres tuteurs.',
        );
      }

      const volunteerIdSet = await this.resolveVolunteerUserIds(
        companyId,
        facilitatorIds,
      );
      const facilitatorsWithStudents = new Set(pairs.map((p) => p.tutorUserId));
      const lonelyNonVolunteers = tutorIds.filter(
        (id) => !volunteerIdSet.has(id) && !facilitatorsWithStudents.has(id),
      );
      if (lonelyNonVolunteers.length > 0) {
        throw new BadRequestException(
          'Chaque tuteur doit être associé à au moins un élève.',
        );
      }

      const assignedStudentIds = new Set(pairs.map((p) => p.studentUserId));
      const orphanCount = studentIds.filter((id) => !assignedStudentIds.has(id)).length;
      if (orphanCount > 0) {
        throw new BadRequestException(
          'Chaque élève doit être assigné à un tuteur pour les séances de type aide aux devoirs, atelier ou tutorat.',
        );
      }
    } else if (studentIds.length < 1) {
      throw new BadRequestException(
        'Chaque séance doit comporter au moins un tuteur et au moins un élève.',
      );
    }

    if (sessionType === 'individual_tutoring' && tutorIds.length > 1) {
      throw new BadRequestException(
        'Tutorat individuel : un seul tuteur est autorisé par séance.',
      );
    }

    const pairsError = validatePairsForSessionType(sessionType, pairs);
    if (pairsError) {
      throw new BadRequestException(pairsError);
    }
  }

  private buildParticipantsFromIds(
    tutorIds: string[],
    studentIds: string[],
    volunteerIds: string[],
  ): { userId: string; role: 'student' | 'tutor' | 'volunteer' }[] {
    const participants: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[] = [];
    tutorIds.forEach((userId) => participants.push({ userId, role: 'tutor' }));
    studentIds.forEach((userId) => participants.push({ userId, role: 'student' }));
    volunteerIds.forEach((userId) => participants.push({ userId, role: 'volunteer' }));
    return participants;
  }

  /**
   * Persist participants and binômes (create / update when tutorIds or studentIds are sent).
   */
  private async persistParticipantsAndPairs(
    sessionId: string,
    companyId: string,
    sessionType: SessionType,
    tutorIds: string[],
    studentIds: string[],
    volunteerIds: string[],
    explicitPairs?: { studentUserId: string; tutorUserId: string }[],
    actorId?: string,
    options?: { auditOnCreate?: boolean },
  ): Promise<void> {
    await this.assertSessionParticipantRules(
      companyId,
      sessionType,
      tutorIds,
      studentIds,
      volunteerIds,
      explicitPairs,
    );

    const pairs = deriveSessionPairsFromCreateInput(
      sessionType,
      tutorIds,
      studentIds,
      explicitPairs,
    );
    const participants = this.buildParticipantsFromIds(tutorIds, studentIds, volunteerIds);

    if (pairs.length > 0) {
      await this.replaceAssignmentsForSession(
        sessionId,
        companyId,
        pairs,
        participants.length > 0 ? participants : undefined,
        actorId,
        { auditOnCreate: options?.auditOnCreate, sessionType },
      );
      return;
    }

    if (participants.length > 0) {
      await this.createParticipantsForSession(sessionId, tutorIds, studentIds, volunteerIds);
    }
  }

  /** After session insert: persist binômes when derivable, otherwise only session_participants. */
  private async persistParticipantsAndPairsOnCreate(
    sessionId: string,
    companyId: string,
    dto: CreateSessionDto,
    actorId?: string,
  ): Promise<void> {
    await this.persistParticipantsAndPairs(
      sessionId,
      companyId,
      dto.type,
      dto.tutorIds ?? [],
      dto.studentIds ?? [],
      dto.volunteerIds ?? [],
      dto.pairs,
      actorId,
      { auditOnCreate: true },
    );
  }

  /** Replace all pairs for a session and sync participants (shared by setAssignments and create). */
  private async replaceAssignmentsForSession(
    sessionId: string,
    companyId: string,
    pairs: { studentUserId: string; tutorUserId: string }[],
    participants?: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[],
    actorId?: string,
    options?: { auditOnCreate?: boolean; sessionType?: SessionType },
  ): Promise<SessionStudentTutorPair[]> {
    let sessionType: SessionType | undefined = options?.sessionType;
    if (!sessionType) {
      const sessionRow = await this.sessionRepository.findOne({
        where: { id: sessionId, companyId },
        select: ['id', 'type'],
      });
      if (!sessionRow) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }
      sessionType = sessionRow.type;
    }
    if (!sessionType) {
      throw new NotFoundException(`Session ${sessionId} has no type`);
    }

    const pairsError = validatePairsForSessionType(sessionType, pairs);
    if (pairsError) {
      throw new BadRequestException(pairsError);
    }

    await this.studentTutorPairRepository.delete({ sessionId });

    const toCreate = pairs.map((p) =>
      this.studentTutorPairRepository.create({
        sessionId,
        sessionType,
        studentUserId: p.studentUserId,
        tutorUserId: p.tutorUserId,
        assignmentSource: 'manual' as AssignmentSource,
      }),
    );
    const saved =
      toCreate.length > 0 ? await this.studentTutorPairRepository.save(toCreate) : [];

    if (participants) {
      await this.syncSessionParticipantsExplicit(sessionId, participants);
    } else {
      await this.syncSessionParticipantsFromPairs(sessionId, saved);
    }

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_assignments',
      entityId: sessionId,
      action: options?.auditOnCreate ? 'CREATE' : 'UPDATE',
      newValue: { pairs: saved.length } as unknown as Record<string, unknown>,
    });

    return saved;
  }

  /** Applies PATCH fields to a session row; for non-anchor rows, does not change date or recurrence definition fields. */
  private async applyRestDtoToSessionEntity(
    session: Session,
    restDto: Omit<
      UpdateSessionDto,
      | 'status'
      | 'tutorIds'
      | 'studentIds'
      | 'volunteerIds'
      | 'newActivity'
      | 'newActivityType'
      | 'recurrenceUpdateScope'
    >,
    opts: {
      isAnchor: boolean;
      schoolYearId: string | undefined;
      finalActivityId: string | null | undefined;
      actorId?: string | null;
    },
  ): Promise<void> {
    const { isAnchor, schoolYearId, finalActivityId, actorId } = opts;
    const updateSubjectIds = restDto.subjectIds;
    const updateLevelIds = restDto.levelIds;
    const patch: Record<string, unknown> = { ...restDto };
    if (!isAnchor) {
      delete patch.sessionDate;
      delete patch.mode;
      delete patch.recurrenceType;
      delete patch.recurrenceRule;
    }
    Object.assign(session, {
      ...patch,
      sessionDate:
        isAnchor && restDto.sessionDate
          ? parseLocalDate(restDto.sessionDate)
          : session.sessionDate,
      schoolYearId: schoolYearId !== undefined ? schoolYearId : session.schoolYearId,
      activityId: finalActivityId !== undefined ? finalActivityId : session.activityId,
      updatedById: actorId ?? session.updatedById,
      ...(updateSubjectIds !== undefined && {
        subjectIds: updateSubjectIds,
        subjectNames: updateSubjectIds.length
          ? await this.resolveSubjectNames(updateSubjectIds, session.companyId)
          : [],
      }),
      ...(updateLevelIds !== undefined && {
        levelIds: updateLevelIds,
        levelNames: updateLevelIds.length
          ? await this.resolveLevelNames(updateLevelIds, session.companyId)
          : [],
      }),
    });
  }

  private async replaceParticipantsWithManager(
    manager: EntityManager,
    sessionId: string,
    tutorIds: string[],
    studentIds: string[],
    volunteerIds: string[],
  ): Promise<void> {
    const pairRepo = manager.getRepository(SessionStudentTutorPair);
    const participantRepo = manager.getRepository(SessionParticipant);
    const existingPairs = await pairRepo.find({ where: { sessionId } });
    await participantRepo.delete({ sessionId });
    const toCreate: { sessionId: string; userId: string; role: 'tutor' | 'student' | 'volunteer' }[] = [];
    tutorIds.forEach((userId) => toCreate.push({ sessionId, userId, role: 'tutor' }));
    studentIds.forEach((userId) => toCreate.push({ sessionId, userId, role: 'student' }));
    volunteerIds.forEach((userId) => toCreate.push({ sessionId, userId, role: 'volunteer' }));
    for (const p of toCreate) {
      await participantRepo.save(
        participantRepo.create({
          sessionId: p.sessionId,
          userId: p.userId,
          role: p.role,
          attendanceStatus: 'absent',
        }),
      );
    }
    const newTutorIdsSet = new Set(tutorIds);
    const newStudentIdsSet = new Set(studentIds);
    const pairsToDelete = existingPairs.filter(
      (pair) => !newTutorIdsSet.has(pair.tutorUserId) || !newStudentIdsSet.has(pair.studentUserId),
    );
    if (pairsToDelete.length > 0) {
      await pairRepo.remove(pairsToDelete);
    }
  }

  private async updateRecurringFollowingBulk(
    anchorId: string,
    companyId: string,
    anchor: Session,
    dto: UpdateSessionDto,
    restDto: Omit<
      UpdateSessionDto,
      | 'status'
      | 'tutorIds'
      | 'studentIds'
      | 'volunteerIds'
      | 'newActivity'
      | 'newActivityType'
      | 'recurrenceUpdateScope'
    >,
    schoolYearId: string | undefined,
    finalActivityId: string | null | undefined,
    tutorIds: string[] | undefined,
    studentIds: string[] | undefined,
    volunteerIds: string[] | undefined,
    actorId?: string,
  ): Promise<Session> {
    const siblings = await this.sessionRepository.find({
      where: { companyId, recurrenceGroupId: anchor.recurrenceGroupId! },
      order: { sessionDate: 'ASC', startTime: 'ASC' },
    });
    const targets = siblings.filter((s) => isSessionAtOrAfter(s, anchor));
    if (targets.length === 0) {
      throw new NotFoundException(`No recurring sessions found for group ${anchor.recurrenceGroupId}`);
    }

    const oldValuesById = new Map<string, Record<string, unknown>>();
    for (const t of targets) {
      oldValuesById.set(t.id, { ...t } as unknown as Record<string, unknown>);
    }

    await this.sessionRepository.manager.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(Session);
      for (const t of targets) {
        const entity = await sessionRepo.findOne({ where: { id: t.id, companyId } });
        if (!entity) {
          throw new NotFoundException(`Session ${t.id} not found`);
        }
        const isAnchor = entity.id === anchorId;
        const mergedDate =
          isAnchor && restDto.sessionDate ? parseLocalDate(restDto.sessionDate) : entity.sessionDate;
        const mergedStart = restDto.startTime ?? entity.startTime;
        const mergedEnd = restDto.endTime ?? entity.endTime;
        const mergedRoomId = restDto.roomId !== undefined ? restDto.roomId : entity.roomId;
        const mergedManagedBy = restDto.managedById !== undefined ? restDto.managedById : entity.managedById;
        const dateStr =
          typeof mergedDate === 'string' ? mergedDate : (mergedDate as Date).toISOString().slice(0, 10);
        await this.checkRoomDoubleBooking(
          companyId,
          mergedRoomId,
          dateStr,
          mergedStart,
          mergedEnd,
          entity.id,
        );
        await this.checkTutorDoubleBooking(
          companyId,
          mergedManagedBy,
          dateStr,
          mergedStart,
          mergedEnd,
          entity.id,
        );
        const effectivePlan =
          restDto.planDuringHolidays !== undefined
            ? restDto.planDuringHolidays
            : (entity.planDuringHolidays ?? true);
        const effectiveEst =
          restDto.establishmentId !== undefined ? restDto.establishmentId : entity.establishmentId;
        const holidayRelevantForRow =
          restDto.planDuringHolidays !== undefined ||
          restDto.establishmentId !== undefined ||
          dto.vacationZoneId !== undefined ||
          (isAnchor && restDto.sessionDate !== undefined);
        if (holidayRelevantForRow) {
          await this.assertSessionDatesNotBlockedByHolidays(
            effectivePlan,
            companyId,
            effectiveEst,
            [dateStr],
            dto.vacationZoneId,
          );
        }
        await this.applyRestDtoToSessionEntity(entity, restDto, {
          isAnchor,
          schoolYearId,
          finalActivityId,
          actorId,
        });
        await sessionRepo.save(entity);
        if (tutorIds !== undefined || studentIds !== undefined || volunteerIds !== undefined) {
          await this.replaceParticipantsWithManager(
            manager,
            entity.id,
            tutorIds ?? [],
            studentIds ?? [],
            volunteerIds ?? [],
          );
        }
      }
    });

    for (const t of targets) {
      await this.auditLogService.log({
        companyId,
        userId: actorId,
        entity: 'sessions',
        entityId: t.id,
        action: 'UPDATE',
        oldValue: oldValuesById.get(t.id) ?? {},
        newValue: {
          ...dto,
          recurrenceUpdateScope: RecurrenceUpdateScope.FOLLOWING,
          recurrenceBulkAffectedIds: targets.map((x) => x.id),
        } as unknown as Record<string, unknown>,
      });
    }

    const bulkScheduleFieldsTouched =
      restDto.sessionDate !== undefined ||
      restDto.startTime !== undefined ||
      restDto.endTime !== undefined ||
      restDto.durationMinutes !== undefined;

    if (bulkScheduleFieldsTouched) {
      for (const t of targets) {
        const isAnchorSession = t.id === anchorId;
        // Pour l'ancre dont la date change, construire la version avec la nouvelle date
        const newDateSession =
          isAnchorSession && restDto.sessionDate
            ? ({ ...t, sessionDate: parseLocalDate(restDto.sessionDate) } as Session)
            : null;

        // Réconcilier l'ancienne date (t conserve les valeurs pré-transaction)
        await this.vscDailyReportsService
          .reconcileAfterSessionChange(t)
          .catch((e) =>
            this.logger.warn(
              `vsc-daily reconcile bulk ${t.id}: ${(e as Error).message}`,
            ),
          );

        // Si la date de l'ancre a changé, réconcilier également la nouvelle date
        if (newDateSession) {
          await this.vscDailyReportsService
            .reconcileAfterSessionChange(newDateSession)
            .catch((e) =>
              this.logger.warn(
                `vsc-daily reconcile bulk new-date ${t.id}: ${(e as Error).message}`,
              ),
            );
        }

        // Créer/mettre à jour les rapports si la séance (ancienne ou nouvelle date) est aujourd'hui
        const sessionForCreate = newDateSession ?? t;
        await this.vscDailyReportsService
          .reconcileOnSameDaySessionCreate(sessionForCreate)
          .catch((e) =>
            this.logger.warn(
              `vsc-daily reconcile-create bulk ${t.id}: ${(e as Error).message}`,
            ),
          );
      }
    }

    const withTz = await this.sessionRepository.findOne({
      where: { id: anchorId, companyId },
      relations: ['establishment'],
    });
    if (!withTz) {
      throw new NotFoundException(`Session ${anchorId} not found`);
    }
    withTz.status = getEffectiveStatus(withTz);
    return withTz;
  }

  async createBulk(
    companyId: string,
    dtos: CreateSessionDto[],
    actorId?: string,
  ): Promise<{
    summary: { total: number; created: number; failed: number };
    results: Array<
      | { index: number; status: 'created'; data: Session | Session[] }
      | { index: number; status: 'error'; error: string }
    >;
  }> {
    // Valider toutes les séances avant d'en créer une seule (pas de succès partiel sur règles métier).
    for (let i = 0; i < dtos.length; i++) {
      const dto = dtos[i];
      try {
        await this.assertSessionParticipantRules(
          companyId,
          dto.type,
          dto.tutorIds ?? [],
          dto.studentIds ?? [],
          dto.volunteerIds ?? [],
          dto.pairs,
        );
      } catch (err: unknown) {
        const message =
          err instanceof BadRequestException
            ? (err.getResponse() as string | { message?: string | string[] })
            : err instanceof Error
              ? err.message
              : String(err);
        const text =
          typeof message === 'string'
            ? message
            : Array.isArray(message?.message)
              ? message.message.join(', ')
              : (message?.message ?? 'Validation des participants impossible.');
        throw new BadRequestException(text);
      }
    }

    const results: Array<
      | { index: number; status: 'created'; data: Session | Session[] }
      | { index: number; status: 'error'; error: string }
    > = [];

    for (let i = 0; i < dtos.length; i++) {
      try {
        const data = await this.create(companyId, dtos[i], actorId, { skipRoomConflictCheck: true });
        results.push({ index: i, status: 'created', data });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ index: i, status: 'error', error: message });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const failed = results.filter((r) => r.status === 'error').length;

    return { summary: { total: dtos.length, created, failed }, results };
  }

  async create(
    companyId: string,
    dto: CreateSessionDto,
    actorId?: string,
    options?: { skipRoomConflictCheck?: boolean },
  ): Promise<Session | Session[]> {
    // Auto-récupération de l'année scolaire courante si non fournie
    let schoolYearId = dto.schoolYearId;
    if (!schoolYearId) {
      const currentSchoolYear = await this.schoolYearRepository.findOne({
        where: { companyId, isCurrent: true },
      });
      if (!currentSchoolYear) {
        throw new NotFoundException(
          'No current school year found. Please set a school year as current or provide schoolYearId.',
        );
      }
      schoolYearId = currentSchoolYear.id;
    }

    // Validation de cohérence
    if (dto.activityId && (dto.newActivity || dto.newActivityType)) {
      throw new BadRequestException(
        'Cannot provide both activityId and newActivity/newActivityType',
      );
    }
    if (dto.newActivityType && !dto.newActivity) {
      throw new BadRequestException(
        'newActivityType requires newActivity to be provided',
      );
    }

    // Déterminer l'activityId final selon les 3 cas
    let finalActivityId: string | null = dto.activityId ?? null;

    // CAS 3 : Double création (ActivityType + Activity)
    if (dto.newActivityType && dto.newActivity) {
      const createdActivityType = await this.activityTypeService.create(
        companyId,
        dto.newActivityType,
        actorId,
      );
      const activityTypeId = createdActivityType.id;

      const activityDto = {
        ...dto.newActivity,
        activityTypeId,
      };
      const createdActivity = await this.activityService.create(
        companyId,
        activityDto,
        actorId,
      );
      finalActivityId = createdActivity.id;
    }
    // CAS 2 : Création Activity seule (avec ActivityType existant)
    else if (dto.newActivity && !dto.newActivityType) {
      const createdActivity = await this.activityService.create(
        companyId,
        dto.newActivity,
        actorId,
      );
      finalActivityId = createdActivity.id;
    }
    // CAS 1 : Activity existante (finalActivityId déjà assigné)

    let activity: Activity | null = null;
    if (finalActivityId !== null && finalActivityId !== undefined) {
      activity = await this.activityRepository.findOne({
        where: { id: finalActivityId as string, companyId },
      });
      if (!activity) {
        throw new NotFoundException(`Activity ${finalActivityId} not found`);
      }
      const tutorCount = dto.tutorIds?.length ?? 0;
      const studentCount = dto.studentIds?.length ?? 0;
      const volunteerCount = dto.volunteerIds?.length ?? 0;
      if (activity.maxTutors != null && tutorCount > activity.maxTutors) {
        throw new BadRequestException(
          `Number of tutors (${tutorCount}) exceeds activity maximum (${activity.maxTutors})`,
        );
      }
      if (activity.maxStudents != null && studentCount > activity.maxStudents) {
        throw new BadRequestException(
          `Number of students (${studentCount}) exceeds activity maximum (${activity.maxStudents})`,
        );
      }
      if (activity.maxVolunteers != null && volunteerCount > activity.maxVolunteers) {
        throw new BadRequestException(
          `Number of volunteers (${volunteerCount}) exceeds activity maximum (${activity.maxVolunteers})`,
        );
      }
    }

    const mode = dto.mode ?? 'single';
    const recurrenceType = (dto.recurrenceType ?? 'none') as RecurrenceType;
    const isRecurring =
      mode === 'recurring' &&
      recurrenceType !== 'none' &&
      recurrenceType !== 'once';

    const basePayload = {
      companyId,
      establishmentId: dto.establishmentId,
      roomId: dto.roomId ?? null,
      programId: dto.programId ?? null,
      schoolYearId,
      levelIds: dto.levelIds ?? [],
      levelNames: dto.levelIds?.length
        ? await this.resolveLevelNames(dto.levelIds, companyId)
        : [],
      sessionDate: parseLocalDate(dto.sessionDate),
      startTime: dto.startTime,
      endTime: dto.endTime,
      type: dto.type,
      sessionFormat: dto.sessionFormat ?? 'in_person',
      joinLink: dto.joinLink ?? null,
      mode,
      recurrenceType: recurrenceType as Session['recurrenceType'],
      recurrenceRule: dto.recurrenceRule ?? null,
      maxStudents: dto.maxStudents ?? null,
      maxVolunteers: dto.maxVolunteers ?? activity?.maxVolunteers ?? null,
      activityId: finalActivityId ?? activity?.id ?? null,
      subjectIds: dto.subjectIds ?? [],
      subjectNames: dto.subjectIds?.length
        ? await this.resolveSubjectNames(dto.subjectIds, companyId)
        : [],
      classId: dto.classId ?? null,
      specialtyIds: dto.specialtyIds ?? null,
      establishmentName: dto.establishmentName ?? null,
      programName: dto.programName ?? null,
      activityName: dto.activityName ?? null,
      topic: dto.topic ?? null,
      durationMinutes: dto.durationMinutes ?? null,
      internalNotes: dto.internalNotes ?? null,
      planDuringHolidays: dto.planDuringHolidays ?? true,
      managedById: dto.managedById ?? null,
      createdById: actorId ?? null,
    };

    const tutorIds = dto.tutorIds ?? [];
    const studentIds = dto.studentIds ?? [];
    const volunteerIds = dto.volunteerIds ?? [];

    await this.assertSessionParticipantRules(
      companyId,
      dto.type,
      tutorIds,
      studentIds,
      volunteerIds,
      dto.pairs,
    );

    if (isRecurring) {
      const schoolYear = await this.schoolYearRepository.findOne({
        where: { id: schoolYearId, companyId },
      });
      if (!schoolYear) {
        throw new NotFoundException(`School year ${schoolYearId} not found`);
      }
      const startDate = parseLocalDate(dto.sessionDate);
      const endDate = schoolYear.endDate;
      let occurrenceDates = this.generateOccurrenceDates(
        startDate,
        recurrenceType,
        dto.recurrenceRule ?? null,
        endDate,
      );
      if (occurrenceDates.length === 0) {
        const startStr = startDate.toISOString().slice(0, 10);
        const endStr = endDate instanceof Date ? endDate.toISOString().slice(0, 10) : String(endDate);
        throw new BadRequestException(
          `Aucune date d'occurrence générée : la date de début (${startStr}) est après la fin de l'année scolaire (${endStr}). Choisissez une année scolaire qui inclut la date de début, ou une date de début dans l'année scolaire sélectionnée.`,
        );
      }
      occurrenceDates = await this.filterOccurrenceDatesExcludingHolidays(
        dto.planDuringHolidays ?? true,
        companyId,
        dto.establishmentId,
        occurrenceDates,
        dto.vacationZoneId,
      );
      if (occurrenceDates.length === 0) {
        throw new BadRequestException(
          `Aucune occurrence hors vacances ou jours fériés : toutes les dates générées par la récurrence tombent sur une période couverte par le calendrier (vacances / jours fériés). Modifiez la date de début ou la récurrence, ou définissez planDuringHolidays à true pour inclure ces jours.`,
        );
      }
      const recurrenceGroupId = crypto.randomUUID();
      const companyTz = await this.getCompanyTimezone(companyId);
      const conflictingDates: string[] = [];
      for (let i = 0; i < occurrenceDates.length; i++) {
        const sessionDate = occurrenceDates[i];
        const dateStr = sessionDate.toISOString().slice(0, 10);
        try {
          if (!options?.skipRoomConflictCheck) {
            await this.checkRoomDoubleBooking(
              companyId,
              basePayload.roomId,
              dateStr,
              basePayload.startTime,
              basePayload.endTime,
              null,
            );
          }
          await this.checkTutorDoubleBooking(
            companyId,
            basePayload.managedById,
            dateStr,
            basePayload.startTime,
            basePayload.endTime,
            null,
          );
        } catch {
          conflictingDates.push(dateStr);
        }
      }
      if (conflictingDates.length > 0) {
        throw new ConflictException(
          `Room or tutor already booked for: ${conflictingDates.join(', ')}`,
        );
      }
      const savedSessions: Session[] = [];
      for (let i = 0; i < occurrenceDates.length; i++) {
        const sessionDate = occurrenceDates[i];
        const entity = this.sessionRepository.create({
          ...basePayload,
          sessionDate,
          recurrenceGroupId,
        });
        const saved = await this.sessionRepository.save(entity);
        await this.persistParticipantsAndPairsOnCreate(saved.id, companyId, dto, actorId);
        await this.auditLogService.log({
          companyId,
          userId: actorId,
          entity: 'sessions',
          entityId: saved.id,
          action: 'CREATE',
          newValue: { ...dto, sessionDate: sessionDate.toISOString().slice(0, 10) } as unknown as Record<string, unknown>,
        });
        // Compte rendu initial : uniquement la première occurrence (même groupe récurrent).
        if (i === 0) {
          await this.maybeCreateInitialSessionReportOnCreate(saved, companyTz);
          await this.vscDailyReportsService.reconcileOnSameDaySessionCreate(saved).catch((e) =>
            this.logger.warn(
              `vsc-daily reconcile-create recurring session=${saved.id}: ${(e as Error).message}`,
            ),
          );
        }
        savedSessions.push(saved);
      }
      return savedSessions;
    }

    if (!options?.skipRoomConflictCheck) {
      await this.checkRoomDoubleBooking(
        companyId,
        basePayload.roomId,
        dto.sessionDate,
        basePayload.startTime,
        basePayload.endTime,
        null,
      );
    }
    await this.checkTutorDoubleBooking(
      companyId,
      basePayload.managedById,
      dto.sessionDate,
      basePayload.startTime,
      basePayload.endTime,
      null,
    );
    await this.assertSessionDatesNotBlockedByHolidays(
      dto.planDuringHolidays ?? true,
      companyId,
      dto.establishmentId,
      [dto.sessionDate.slice(0, 10)],
      dto.vacationZoneId,
    );
    const entity = this.sessionRepository.create(basePayload);
    const saved = await this.sessionRepository.save(entity);
    await this.persistParticipantsAndPairsOnCreate(saved.id, companyId, dto, actorId);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'sessions',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    const companyTz = await this.getCompanyTimezone(companyId);
    await this.maybeCreateInitialSessionReportOnCreate(saved, companyTz);
    await this.vscDailyReportsService.reconcileOnSameDaySessionCreate(saved).catch((e) =>
      this.logger.warn(
        `vsc-daily reconcile-create session=${saved.id}: ${(e as Error).message}`,
      ),
    );
    return saved;
  }

  async findAll(
    companyId: string,
    query?: ListSessionsQueryDto,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
    actionScopes?: Record<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<Session>> {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const { skip, take } = getSkipTake(page, pageSize);

    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.establishment', 'establishment')
      .where('session.company_id = :companyId', { companyId });

    // Apply visibility scope via the centralized resolver.
    if (visibilityScope !== undefined && visibilityScope !== null) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'sessions',
        { userId: userId ?? '', companyId },
      );
    }

    if (query?.managedById) {
      qb.andWhere('session.managed_by = :managedById', { managedById: query.managedById });
    }

    // NOTE: status filter is applied AFTER getEffectiveStatus to filter by computed status
    // Do not filter by status in the query builder
    const requestedStatuses = query?.statuses?.length ? query.statuses : null;

    if (query?.establishmentId) {
      qb.andWhere('session.establishment_id = :establishmentId', {
        establishmentId: query.establishmentId,
      });
    }
    if (query?.roomId) {
      qb.andWhere('session.room_id = :roomId', { roomId: query.roomId });
    }
    if (query?.dateFrom) {
      qb.andWhere('session.session_date >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query?.dateTo) {
      qb.andWhere('session.session_date <= :dateTo', { dateTo: query.dateTo });
    }
    if (query?.types?.length) {
      qb.andWhere('session.type IN (:...types)', { types: query.types });
    }
    if (query?.schoolYearId) {
      qb.andWhere('session.school_year_id = :schoolYearId', { schoolYearId: query.schoolYearId });
    }
    if (query?.activityId) {
      qb.andWhere('session.activity_id = :activityId', { activityId: query.activityId });
    }
    if (query?.subjectId) {
      qb.andWhere('session.subject_ids @> :subjectIdArr::jsonb', {
        subjectIdArr: JSON.stringify([query.subjectId]),
      });
    }
    if (query?.levelId) {
      qb.andWhere('session.level_ids @> :levelIdArr::jsonb', {
        levelIdArr: JSON.stringify([query.levelId]),
      });
    }
    if (query?.search) {
      const searchParam = `%${query.search}%`;
      qb.andWhere(
        `(
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = session.managed_by
              AND (u.first_name ILIKE :searchParam OR u.last_name ILIKE :searchParam
                OR u.display_name ILIKE :searchParam
                OR CONCAT(u.first_name, ' ', u.last_name) ILIKE :searchParam)
          ) OR EXISTS (
            SELECT 1 FROM session_participants sp
            JOIN users up ON up.id = sp.user_id
            WHERE sp.session_id = session.id
              AND (up.first_name ILIKE :searchParam OR up.last_name ILIKE :searchParam
                OR up.display_name ILIKE :searchParam
                OR CONCAT(up.first_name, ' ', up.last_name) ILIKE :searchParam)
          ) OR EXISTS (
            SELECT 1 FROM assignments a
            JOIN users uv ON uv.id = a.volunteer_user_id
            WHERE a.session_id = session.id
              AND (uv.first_name ILIKE :searchParam OR uv.last_name ILIKE :searchParam
                OR uv.display_name ILIKE :searchParam
                OR CONCAT(uv.first_name, ' ', uv.last_name) ILIKE :searchParam)
          )
        )`,
        { searchParam },
      );
    }

    if (query?.recurrenceType) {
      qb.andWhere('session.recurrence_type = :recurrenceType', { recurrenceType: query.recurrenceType });
    }

    // Apply sorting
    if (query?.sortBy) {
      const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      // Map frontend field names to entity property paths (TypeORM-safe for pagination/count queries)
      const fieldMap: Record<string, string> = {
        sessionDate: 'session.sessionDate',
        startTime: 'session.startTime',
        endTime: 'session.endTime',
        createdAt: 'session.createdAt',
        updatedAt: 'session.updatedAt',
        status: 'session.status',
        type: 'session.type',
      };
      const dbField = fieldMap[query.sortBy] || `session.${query.sortBy}`;
      qb.orderBy(dbField, sortOrder);
      // Add secondary sort by start_time if not already sorting by it
      if (query.sortBy !== 'startTime') {
        qb.addOrderBy('session.startTime', sortOrder);
      }
    } else {
      // Default sorting: chronological order (ASC)
      qb.orderBy('session.sessionDate', 'ASC').addOrderBy(
        'session.startTime',
        'ASC',
      );
    }

    // When filtering by status, we need to fetch more records and then filter
    // This is because getEffectiveStatus may change the status
    let allData: Session[];
    let total: number;

    if (requestedStatuses) {
      // Fetch all matching records without pagination
      allData = await qb.getMany();
      
      // Apply effective status computation
      allData.forEach((s) => {
        s.status = getEffectiveStatus(s);
      });

      // Filter by requested statuses
      allData = allData.filter(s => requestedStatuses.includes(s.status));
      total = allData.length;

      // Apply pagination on the filtered results
      allData = allData.slice(skip, skip + take);
    } else {
      // No status filter: use normal pagination
      const [data, count] = await qb.skip(skip).take(take).getManyAndCount();
      allData = data;
      total = count;
      
      // Apply effective status computation
      allData.forEach((s) => {
        s.status = getEffectiveStatus(s);
      });
    }

    if (allData.length > 0) {
      const sessionIds = allData.map((s) => s.id);
      const [participants, studentTutorPairs] = await Promise.all([
        this.participantRepository.find({
          where: { sessionId: In(sessionIds) },
          relations: ['user', 'user.userProfiles'],
        }),
        this.studentTutorPairRepository.find({
          where: { sessionId: In(sessionIds) },
          relations: ['studentUser', 'tutorUser', 'studentUser.userProfiles', 'tutorUser.userProfiles'],
        }),
      ]);
      const participantsBySession = new Map<string, SessionParticipant[]>();
      for (const p of participants) {
        const list = participantsBySession.get(p.sessionId) ?? [];
        list.push(p);
        participantsBySession.set(p.sessionId, list);
      }
      const pairsBySession = new Map<string, SessionStudentTutorPair[]>();
      for (const pair of studentTutorPairs) {
        const list = pairsBySession.get(pair.sessionId) ?? [];
        list.push(pair);
        pairsBySession.set(pair.sessionId, list);
      }
      allData.forEach((s) => {
        (s as Session & { participants?: SessionParticipant[] }).participants =
          participantsBySession.get(s.id) ?? [];
        (s as Session & { studentTutorPairs?: SessionStudentTutorPair[] }).studentTutorPairs =
          pairsBySession.get(s.id) ?? [];
      });
    }

    // Compute _permissions per row — parallel resolution for all action scopes
    if (actionScopes && Object.keys(actionScopes).length > 0 && allData.length > 0) {
      const sessionIds = allData.map((s) => s.id);

      const entries = await Promise.all(
        Object.entries(actionScopes).map(async ([actionId, scope]) => {
          if (scope) {
            const ids = await this.visibilityScopeResolver.resolveEntityIds(
              sessionIds,
              'session.id',
              scope,
              'sessions',
              { userId: userId ?? '', companyId },
            );
            return [actionId, ids] as const;
          }
          // Null scope = unrestricted for this action
          return [actionId, new Set(sessionIds)] as const;
        }),
      );

      const permissionsMap = Object.fromEntries(entries);

      // Mark each session
      allData.forEach((s) => {
        (s as any)._permissions = Object.fromEntries(
          Object.entries(permissionsMap).map(([actionId, ids]) => [actionId, ids.has(s.id)]),
        );
      });
    }

    return createPaginatedResponse(allData, total, page, pageSize);
  }

  /** Returns all matching sessions (no pagination) for export. */
  async findAllForExport(
    companyId: string,
    query?: ListSessionsQueryDto,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<Session[]> {
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.establishment', 'establishment')
      .leftJoinAndSelect('session.schoolYear', 'schoolYear')
      .leftJoinAndSelect('session.room', 'room')
      .leftJoinAndSelect('session.sessionParticipants', 'sessionParticipants')
      .leftJoinAndSelect('sessionParticipants.user', 'participantUser')
      .where('session.company_id = :companyId', { companyId });

    if (visibilityScope !== undefined && visibilityScope !== null) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'sessions',
        { userId: userId ?? '', companyId },
      );
    }

    if (query?.managedById) {
      qb.andWhere('session.managed_by = :managedById', { managedById: query.managedById });
    }

    if (query?.statuses?.length) {
      qb.andWhere('session.status IN (:...statuses)', { statuses: query.statuses });
    }
    if (query?.establishmentId) {
      qb.andWhere('session.establishment_id = :establishmentId', {
        establishmentId: query.establishmentId,
      });
    }
    if (query?.roomId) {
      qb.andWhere('session.room_id = :roomId', { roomId: query.roomId });
    }
    if (query?.dateFrom) {
      qb.andWhere('session.session_date >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query?.dateTo) {
      qb.andWhere('session.session_date <= :dateTo', { dateTo: query.dateTo });
    }
    if (query?.types?.length) {
      qb.andWhere('session.type IN (:...types)', { types: query.types });
    }
    if (query?.schoolYearId) {
      qb.andWhere('session.school_year_id = :schoolYearId', { schoolYearId: query.schoolYearId });
    }
    if (query?.activityId) {
      qb.andWhere('session.activity_id = :activityId', { activityId: query.activityId });
    }
    if (query?.subjectId) {
      qb.andWhere('session.subject_ids @> :subjectIdArr2::jsonb', {
        subjectIdArr2: JSON.stringify([query.subjectId]),
      });
    }
    if (query?.levelId) {
      qb.andWhere('session.level_ids @> :levelIdArr2::jsonb', {
        levelIdArr2: JSON.stringify([query.levelId]),
      });
    }

    if (query?.recurrenceType) {
      qb.andWhere('session.recurrence_type = :recurrenceType', { recurrenceType: query.recurrenceType });
    }

    // Apply sorting
    if (query?.sortBy) {
      const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      // Map frontend field names to database column names
      const fieldMap: Record<string, string> = {
        sessionDate: 'session.session_date',
        startTime: 'session.start_time',
        endTime: 'session.end_time',
        createdAt: 'session.created_at',
        updatedAt: 'session.updated_at',
        status: 'session.status',
        type: 'session.type',
      };
      const dbField = fieldMap[query.sortBy] || `session.${query.sortBy}`;
      qb.orderBy(dbField, sortOrder);
      // Add secondary sort by start_time if not already sorting by it
      if (query.sortBy !== 'startTime') {
        qb.addOrderBy('session.start_time', sortOrder);
      }
    } else {
      // Default sorting
      qb.orderBy('session.session_date', 'DESC').addOrderBy(
        'session.start_time',
        'DESC',
      );
    }
    const list = await qb.getMany();
    list.forEach((s) => {
      s.status = getEffectiveStatus(s);
    });
    return list;
  }

  async findOne(
    id: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id, companyId },
      relations: [
        'establishment',
        'room',
        'activity',
        'program',
        'schoolYear',
        'managedBy',
      ],
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    if (userId && roleCodes) {
      await this.assertSessionAccess(id, companyId, userId, roleCodes);
    }
    session.status = getEffectiveStatus(session);
    const [report, participants, studentTutorPairs] = await Promise.all([
      this.sessionReportRepository.findOne({
        where: { sessionId: id, companyId },
        select: ['id'],
      }),
      this.participantRepository.find({
        where: { sessionId: id },
        relations: ['user', 'user.userProfiles'],
        order: { createdAt: 'DESC' },
      }),
      this.studentTutorPairRepository.find({
        where: { sessionId: id },
        relations: ['studentUser', 'tutorUser', 'studentUser.userProfiles', 'tutorUser.userProfiles'],
        order: { createdAt: 'ASC' },
      }),
    ]);
    (session as Session & { reportId?: string | null }).reportId = report?.id ?? null;
    (session as Session & { participants?: SessionParticipant[] }).participants = participants;
    (session as Session & { studentTutorPairs?: SessionStudentTutorPair[] }).studentTutorPairs = studentTutorPairs;
    this.applySessionSubjectLabelCompat(session);
    return session;
  }

  /**
   * Load session with relations needed for AI context (tutor assistant).
   * Used by sessions-ai.service for the chatbot system prompt.
   */
  async findOneForAiContext(
    id: string,
    companyId: string,
    userId: string,
    roleCodes: string[],
  ): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id, companyId },
      relations: ['establishment', 'managedBy'],
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    await this.assertSessionAccess(id, companyId, userId, roleCodes);
    this.applySessionSubjectLabelCompat(session);
    return session;
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateSessionDto,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
    writeScope?: VisibilityScope | null,
  ): Promise<Session> {
    const session = await this.findOneSession(id, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(id, companyId, userId, roleCodes, writeScope);
    }

    // Auto-récupération de l'année scolaire courante si fournie explicitement comme undefined/null
    let schoolYearId = dto.schoolYearId;
    if (dto.schoolYearId === null || (dto.schoolYearId === undefined && 'schoolYearId' in dto)) {
      const currentSchoolYear = await this.schoolYearRepository.findOne({
        where: { companyId, isCurrent: true },
      });
      if (!currentSchoolYear) {
        throw new NotFoundException(
          'No current school year found. Please set a school year as current.',
        );
      }
      schoolYearId = currentSchoolYear.id;
    }

    // Validation de cohérence pour création inline
    if (dto.activityId && (dto.newActivity || dto.newActivityType)) {
      throw new BadRequestException(
        'Cannot provide both activityId and newActivity/newActivityType',
      );
    }
    if (dto.newActivityType && !dto.newActivity) {
      throw new BadRequestException(
        'newActivityType requires newActivity to be provided',
      );
    }

    // Déterminer l'activityId final selon les 3 cas
    let finalActivityId: string | null | undefined = dto.activityId;

    // CAS 3 : Double création (ActivityType + Activity)
    if (dto.newActivityType && dto.newActivity) {
      const createdActivityType = await this.activityTypeService.create(
        companyId,
        dto.newActivityType,
        actorId,
      );
      const activityTypeId = createdActivityType.id;

      const activityDto = {
        ...dto.newActivity,
        activityTypeId,
      };
      const createdActivity = await this.activityService.create(
        companyId,
        activityDto,
        actorId,
      );
      finalActivityId = createdActivity.id;
    }
    // CAS 2 : Création Activity seule (avec ActivityType existant)
    else if (dto.newActivity && !dto.newActivityType) {
      const createdActivity = await this.activityService.create(
        companyId,
        dto.newActivity,
        actorId,
      );
      finalActivityId = createdActivity.id;
    }

    // Validation des capacités si activity change
    if (finalActivityId !== undefined && finalActivityId !== null) {
      const activity = await this.activityRepository.findOne({
        where: { id: finalActivityId as string, companyId },
      });
      if (activity) {
        // Compter les participants actuels ou nouveaux
        const tutorCount = dto.tutorIds?.length ?? (await this.participantRepository.count({
          where: { sessionId: id, role: 'tutor' },
        }));
        const studentCount = dto.studentIds?.length ?? (await this.participantRepository.count({
          where: { sessionId: id, role: 'student' },
        }));
        const volunteerCount = dto.volunteerIds?.length ?? (await this.participantRepository.count({
          where: { sessionId: id, role: 'volunteer' },
        }));

        if (activity.maxTutors != null && tutorCount > activity.maxTutors) {
          throw new BadRequestException(
            `Number of tutors (${tutorCount}) exceeds activity maximum (${activity.maxTutors})`,
          );
        }
        if (activity.maxStudents != null && studentCount > activity.maxStudents) {
          throw new BadRequestException(
            `Number of students (${studentCount}) exceeds activity maximum (${activity.maxStudents})`,
          );
        }
        if (activity.maxVolunteers != null && volunteerCount > activity.maxVolunteers) {
          throw new BadRequestException(
            `Number of volunteers (${volunteerCount}) exceeds activity maximum (${activity.maxVolunteers})`,
          );
        }
      }
    }

    const {
      status: statusRequested,
      tutorIds,
      studentIds,
      volunteerIds,
      newActivity,
      newActivityType,
      schoolYearId: dtoSchoolYearId,
      recurrenceUpdateScope,
      ...restDto
    } = dto;

    if (
      recurrenceUpdateScope === RecurrenceUpdateScope.FOLLOWING &&
      statusRequested !== undefined
    ) {
      throw new BadRequestException(
        'recurrenceUpdateScope "following" cannot be combined with status changes; cancel or update occurrences separately.',
      );
    }

    const useFollowingBulk =
      recurrenceUpdateScope === RecurrenceUpdateScope.FOLLOWING &&
      !!session.recurrenceGroupId &&
      session.mode === 'recurring' &&
      statusRequested === undefined;

    if (useFollowingBulk) {
      return this.updateRecurringFollowingBulk(
        id,
        companyId,
        session,
        dto,
        restDto,
        schoolYearId,
        finalActivityId,
        tutorIds,
        studentIds,
        volunteerIds,
        actorId,
      );
    }

    const sessionDate = restDto.sessionDate ? parseLocalDate(restDto.sessionDate) : session.sessionDate;
    const startTime = restDto.startTime ?? session.startTime;
    const endTime = restDto.endTime ?? session.endTime;
    const roomId = restDto.roomId !== undefined ? restDto.roomId : session.roomId;
    const managedById = restDto.managedById !== undefined ? restDto.managedById : session.managedById;
    const dateStr = typeof sessionDate === 'string' ? sessionDate : sessionDate.toISOString().slice(0, 10);
    await this.checkRoomDoubleBooking(
      companyId,
      roomId,
      dateStr,
      startTime,
      endTime,
      id,
    );
    await this.checkTutorDoubleBooking(
      companyId,
      managedById,
      dateStr,
      startTime,
      endTime,
      id,
    );
    const nextEstablishmentId = restDto.establishmentId ?? session.establishmentId;
    const nextPlan =
      restDto.planDuringHolidays !== undefined
        ? restDto.planDuringHolidays
        : (session.planDuringHolidays ?? true);
    const schedulePolicyTouched =
      restDto.sessionDate !== undefined ||
      restDto.planDuringHolidays !== undefined ||
      restDto.establishmentId !== undefined ||
      restDto.vacationZoneId !== undefined;
    if (schedulePolicyTouched) {
      await this.assertSessionDatesNotBlockedByHolidays(
        nextPlan,
        companyId,
        nextEstablishmentId,
        [dateStr],
        restDto.vacationZoneId,
      );
    }
    if (statusRequested !== undefined) {
      if (statusRequested !== SessionStatus.CANCELLED) {
        throw new BadRequestException(
          'Only cancellation (PLANNED → CANCELLED) is allowed via PATCH',
        );
      }
      await this.applySessionStatusTransition(
        session,
        SessionStatus.CANCELLED,
        'manual',
        actorId ?? undefined,
      );
    }
    const oldValue = { ...session } as unknown as Record<string, unknown>;
    const oldSessionDateStr = toLocalDateString(session.sessionDate);
    const oldEstablishmentId = session.establishmentId;
    await this.applyRestDtoToSessionEntity(session, restDto, {
      isAnchor: true,
      schoolYearId,
      finalActivityId,
      actorId,
    });
    const saved = await this.sessionRepository.save(session);

    if (tutorIds !== undefined || studentIds !== undefined || volunteerIds !== undefined) {
      const sessionType = (restDto.type ?? session.type) as SessionType;
      await this.persistParticipantsAndPairs(
        id,
        companyId,
        sessionType,
        tutorIds ?? [],
        studentIds ?? [],
        volunteerIds ?? [],
        dto.pairs,
        actorId,
      );
    }

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'sessions',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });

    const scheduleFieldsTouched =
      restDto.sessionDate !== undefined ||
      restDto.startTime !== undefined ||
      restDto.endTime !== undefined ||
      restDto.durationMinutes !== undefined;

    if (scheduleFieldsTouched) {
      const newSessionDateStr = toLocalDateString(saved.sessionDate);
      const estChanged = saved.establishmentId !== oldEstablishmentId;
      const dateChanged = newSessionDateStr !== oldSessionDateStr || estChanged;

      if (dateChanged) {
        // Réconcilier l'ancienne date/établissement (supprime ou recalcule)
        const oldSessionSnap = {
          ...saved,
          sessionDate: parseLocalDate(oldSessionDateStr),
          establishmentId: oldEstablishmentId,
        } as Session;
        await this.vscDailyReportsService
          .reconcileAfterSessionChange(oldSessionSnap)
          .catch((e) =>
            this.logger.warn(
              `vsc-daily reconcile old-date session=${id}: ${(e as Error).message}`,
            ),
          );
        // Nouvelle date == aujourd'hui → créer/mettre à jour les rapports
        await this.vscDailyReportsService
          .reconcileOnSameDaySessionCreate(saved)
          .catch((e) =>
            this.logger.warn(
              `vsc-daily reconcile-create new-date session=${id}: ${(e as Error).message}`,
            ),
          );
      } else {
        // Même date, horaires/durée modifiés → recalcul visible_at
        await this.vscDailyReportsService
          .reconcileAfterSessionChange(saved)
          .catch((e) =>
            this.logger.warn(
              `vsc-daily reconcile session=${id}: ${(e as Error).message}`,
            ),
          );
      }
    }

    const withTz = await this.sessionRepository.findOne({
      where: { id: saved.id, companyId },
      relations: ['establishment'],
    });
    saved.status = getEffectiveStatus(withTz ?? saved);
    return saved;
  }

  async cancelSession(
    id: string,
    companyId: string,
    dto: CancelSessionDto,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
    writeScope?: VisibilityScope | null,
  ): Promise<CancelSessionResult> {
    const session = await this.findOneSession(id, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(id, companyId, userId, roleCodes, writeScope);
    }

    if (dto.reasonCode === CancelSessionReasonCode.OTHER && !dto.reasonDetail?.trim()) {
      throw new BadRequestException('reasonDetail is required when reasonCode is OTHER');
    }

    const effectiveDematchMode = CancelSessionDematchMode.GLOBAL;
    const oldValue = { ...session } as unknown as Record<string, unknown>;

    const existingPairs = await this.studentTutorPairRepository.find({
      where: { sessionId: id },
    });
    const removedPairsCount = existingPairs.length;
    if (removedPairsCount > 0) {
      await this.studentTutorPairRepository.delete({ sessionId: id });
    }

    await this.applySessionStatusTransition(
      session,
      SessionStatus.CANCELLED,
      'manual',
      actorId ?? undefined,
      {
        reasonCode: dto.reasonCode,
        reasonDetail: dto.reasonDetail?.trim() || null,
        dematchMode: effectiveDematchMode,
        removedPairsCount,
      },
    );

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'sessions',
      entityId: id,
      action: 'UPDATE',
      oldValue,
      newValue: {
        status: SessionStatus.CANCELLED,
        reasonCode: dto.reasonCode,
        reasonDetail: dto.reasonDetail?.trim() || null,
        dematchMode: effectiveDematchMode,
        removedPairsCount,
      } as Record<string, unknown>,
    });

    const withTz = await this.sessionRepository.findOne({
      where: { id: session.id, companyId },
      relations: ['establishment'],
    });
    const responseSession = withTz ?? session;
    responseSession.status = getEffectiveStatus(responseSession);

    return {
      session: responseSession,
      removedPairsCount,
    };
  }

  async remove(
    id: string,
    companyId: string,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    const session = await this.findOneSession(id, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(id, companyId, userId, roleCodes, writeScope);
    }
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'sessions',
      entityId: id,
      action: 'DELETE',
      oldValue: { id: session.id } as Record<string, unknown>,
    });
    await this.sessionRepository.softDelete(id);
    await this.vscDailyReportsService.reconcileAfterSessionChange(session);
  }

  async getSessionConfig(companyId: string): Promise<SessionConfig | null> {
    return this.sessionConfigRepository.findOne({
      where: { companyId },
    });
  }

  async putSessionConfig(
    companyId: string,
    dto: PutSessionConfigDto,
    actorId?: string,
  ): Promise<SessionConfig> {
    let config = await this.sessionConfigRepository.findOne({
      where: { companyId },
    });
    const oldValue = config
      ? ({ ...config } as unknown as Record<string, unknown>)
      : undefined;
    if (config) {
      Object.assign(config, dto);
    } else {
      config = this.sessionConfigRepository.create({
        companyId,
        ...dto,
      });
    }
    const saved = await this.sessionConfigRepository.save(config);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_configs',
      entityId: saved.id,
      action: oldValue ? 'UPDATE' : 'CREATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  /** Coordinator dashboard: today's sessions, report KPIs. */
  async getCoordinatorDashboard(companyId: string): Promise<{
    todaysSessions: Session[];
    reportKpis: {
      missingReports: number;
      overdueReports: number;
      pendingReports: number;
      submittedPendingValidation: number;
      validatedReports: number;
    };
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const todaysSessions = await this.sessionRepository.find({
      where: { companyId, sessionDate: new Date(today) },
      order: { startTime: 'ASC' },
      relations: ['establishment'],
    });
    todaysSessions.forEach((s) => {
      s.status = getEffectiveStatus(s);
    });
    const reportKpis = await this.getReportKpis(companyId);
    return { todaysSessions, reportKpis };
  }

  /** Tutor dashboard: upcoming sessions for the user, reports to submit (draft by this author). */
  async getTutorDashboard(
    companyId: string,
    userId: string,
  ): Promise<{
    upcomingSessions: Session[];
    reportsToSubmit: SessionReport[];
    reports: SessionReport[];
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const asManagerUpcoming = await this.sessionRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.establishment', 'establishment')
      .where('s.company_id = :companyId', { companyId })
      .andWhere('s.managed_by = :userId', { userId })
      .andWhere('s.session_date >= :today', { today })
      .andWhere('s.status NOT IN (:...excluded)', {
        excluded: [SessionStatus.CANCELLED, SessionStatus.CLOSED],
      })
      .orderBy('s.session_date', 'ASC')
      .addOrderBy('s.start_time', 'ASC')
      .getMany();
    const participantSessionIds = await this.participantRepository
      .createQueryBuilder('p')
      .select('p.session_id')
      .where('p.user_id = :userId', { userId })
      .getRawMany();
    const ids = participantSessionIds.map((r) => r.session_id).filter(Boolean);
    const asParticipant =
      ids.length === 0
        ? []
        : await this.sessionRepository
            .createQueryBuilder('s')
            .leftJoinAndSelect('s.establishment', 'establishment')
            .where('s.company_id = :companyId', { companyId })
            .andWhere('s.session_date >= :today', { today })
            .andWhere('s.status NOT IN (:...excluded)', {
              excluded: [SessionStatus.CANCELLED, SessionStatus.CLOSED],
            })
            .andWhere('s.id IN (:...ids)', { ids })
            .orderBy('s.session_date', 'ASC')
            .addOrderBy('s.start_time', 'ASC')
            .getMany();
    const seen = new Set<string>();
    const upcomingSessions = [...asManagerUpcoming, ...asParticipant].filter(
      (s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      },
    );
    upcomingSessions.sort(
      (a, b) =>
        new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime() ||
        String(a.startTime).localeCompare(String(b.startTime)),
    );
    upcomingSessions.forEach((s) => {
      s.status = getEffectiveStatus(s);
    });
    // All session IDs where this tutor is a participant or manager (no date filter — covers past sessions too)
    const allParticipantSessionIds = await this.participantRepository
      .createQueryBuilder('p')
      .select('p.session_id')
      .where('p.user_id = :userId', { userId })
      .getRawMany();
    const allParticipantIds = allParticipantSessionIds.map((r) => r.session_id).filter(Boolean);
    const managedSessionIds = await this.sessionRepository
      .createQueryBuilder('s')
      .select('s.id', 'id')
      .where('s.company_id = :companyId', { companyId })
      .andWhere('s.managed_by = :userId', { userId })
      .getRawMany();
    const allManagedIds = managedSessionIds.map((r) => r.id).filter(Boolean);
    const allTutorSessionIds = [...new Set([...allParticipantIds, ...allManagedIds])];

    // Reports authored by the tutor OR belonging to any session the tutor is part of
    const reportWhere = allTutorSessionIds.length > 0
      ? [{ companyId, authorId: userId }, { companyId, sessionId: In(allTutorSessionIds) }]
      : [{ companyId, authorId: userId }];

    const reportsToSubmit = await this.sessionReportRepository.find({
      where: reportWhere.map((w) => ({ ...w, status: 'draft' as const })),
      relations: ['session'],
      order: { createdAt: 'DESC' },
    });
    const reports = await this.sessionReportRepository.find({
      where: reportWhere,
      relations: ['session'],
      order: { createdAt: 'DESC' },
    });
    return { upcomingSessions, reportsToSubmit, reports };
  }

  /** Tutor-scoped past sessions with participants for attendance history. */
  async getTutorAttendanceHistory(
    companyId: string,
    userId: string,
    query: AttendanceHistoryQueryDto,
  ): Promise<{
    items: Array<{ session: Session; participants: SessionParticipant[] }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const page = query.page ?? 1;
    const pageSize = Math.min(Math.max(1, query.pageSize ?? 20), 100);
    const { skip, take } = getSkipTake(page, pageSize);

    const participantIds = await this.participantRepository
      .createQueryBuilder('p')
      .select('p.session_id', 'sessionId')
      .where('p.user_id = :userId', { userId })
      .getRawMany();
    const participantSessionIds = (participantIds as { sessionId: string }[]).map((r) => r.sessionId).filter(Boolean);
    const assignmentIds = await this.assignmentRepository
      .createQueryBuilder('a')
      .select('a.session_id', 'sessionId')
      .where('a.volunteer_user_id = :userId', { userId })
      .getRawMany();
    const assignmentSessionIds = (assignmentIds as { sessionId: string }[]).map((r) => r.sessionId).filter(Boolean);

    const qb = this.sessionRepository
      .createQueryBuilder('s')
      .where('s.company_id = :companyId', { companyId })
      .andWhere(
        '(s.session_date < :today OR s.status IN (:...pastStatuses))',
        { today, pastStatuses: [SessionStatus.COMPLETED, SessionStatus.CLOSED] },
      )
      .andWhere(
        '(s.managed_by = :userId OR s.id IN (:...participantIds) OR s.id IN (:...assignmentIds))',
        {
          userId,
          participantIds: participantSessionIds.length > 0 ? participantSessionIds : ['00000000-0000-0000-0000-000000000000'],
          assignmentIds: assignmentSessionIds.length > 0 ? assignmentSessionIds : ['00000000-0000-0000-0000-000000000000'],
        },
      );
    if (query.dateFrom) {
      qb.andWhere('s.session_date >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('s.session_date <= :dateTo', { dateTo: query.dateTo });
    }
    qb.orderBy('s.session_date', 'DESC').addOrderBy('s.start_time', 'DESC');

    const total = await qb.getCount();
    const sessions = await qb.skip(skip).take(take).getMany();
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length === 0) {
      return { items: [], total, page, pageSize };
    }
    const participants = await this.participantRepository.find({
      where: { sessionId: In(sessionIds) },
      relations: ['user'],
    });
    const participantsBySession = new Map<string, SessionParticipant[]>();
    for (const p of participants) {
      const list = participantsBySession.get(p.sessionId) ?? [];
      list.push(p);
      participantsBySession.set(p.sessionId, list);
    }
    const items = sessions.map((session) => ({
      session,
      participants: participantsBySession.get(session.id) ?? [],
    }));
    return { items, total, page, pageSize };
  }

  /**
   * Tutor / volunteer / VSC mobile KPIs: restrict to sessions they manage or where they are participants.
   * Staff (admin/manager/coordinator) keeps company-wide counts — no dependency on menu LinkedElement visibility.
   */
  private shouldScopeReportKpisToUserSessions(roleCodes: string[] | undefined): boolean {
    if (!roleCodes?.length) return false;
    const upper = new Set(roleCodes.map((r) => (r ?? '').toUpperCase()));
    const tutorLike =
      upper.has('TUTOR') || upper.has('VOLUNTEER') || upper.has('VSC');
    if (!tutorLike) return false;
    const staff = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'COORDINATOR'].some((code) =>
      upper.has(code),
    );
    return !staff;
  }

  private async resolveSessionIdsForTutorLikeReportKpis(
    companyId: string,
    userId: string,
  ): Promise<string[]> {
    const participantRows = await this.participantRepository
      .createQueryBuilder('p')
      .innerJoin('sessions', 's', 's.id = p.session_id AND s.company_id = :companyId', {
        companyId,
      })
      .select('p.session_id', 'sessionId')
      .where('p.user_id = :userId', { userId })
      .getRawMany<{ sessionId: string }>();
    const participantIds = participantRows.map((r) => r.sessionId).filter(Boolean);

    const managedSessions = await this.sessionRepository.find({
      where: { companyId, managedById: userId },
      select: { id: true },
    });
    const managedIds = managedSessions.map((s) => s.id);

    return [...new Set([...participantIds, ...managedIds])];
  }

  /** Report KPIs for the company, or scoped to tutor/volunteer/VSC session set (managed_by + participant). */
  async getReportKpis(
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<{
    missingReports: number;
    overdueReports: number;
    /** À saisir : statuts to_complete, draft, overdue (sur le périmètre séances concerné). */
    pendingReports: number;
    submittedPendingValidation: number;
    validatedReports: number;
  }> {
    const scopeToUserSessions =
      !!userId && this.shouldScopeReportKpisToUserSessions(roleCodes);

    if (scopeToUserSessions) {
      const scopedIds = await this.resolveSessionIdsForTutorLikeReportKpis(companyId, userId);
      if (scopedIds.length === 0) {
        return {
          missingReports: 0,
          overdueReports: 0,
          pendingReports: 0,
          submittedPendingValidation: 0,
          validatedReports: 0,
        };
      }
      const completedScoped = await this.sessionRepository.find({
        where: {
          companyId,
          id: In(scopedIds),
          status: In([SessionStatus.COMPLETED, SessionStatus.CLOSED]),
        },
        select: { id: true },
      });
      const completedIds = completedScoped.map((s) => s.id);
      let missingReports = 0;
      if (completedIds.length > 0) {
        const sessionsWithReport = await this.sessionReportRepository
          .createQueryBuilder('r')
          .select('r.session_id')
          .where('r.company_id = :companyId', { companyId })
          .andWhere('r.session_id IN (:...ids)', { ids: completedIds })
          .getRawMany();
        const withReportIds = new Set(sessionsWithReport.map((r) => r.session_id as string));
        missingReports = completedIds.filter((id) => !withReportIds.has(id)).length;
      }
      const [overdue, submitted, validated, pendingReports] = await Promise.all([
        this.sessionReportRepository.count({
          where: { companyId, status: 'overdue', sessionId: In(scopedIds) },
        }),
        this.sessionReportRepository.count({
          where: { companyId, status: 'submitted', sessionId: In(scopedIds) },
        }),
        this.sessionReportRepository.count({
          where: { companyId, status: 'validated', sessionId: In(scopedIds) },
        }),
        this.sessionReportRepository.count({
          where: {
            companyId,
            sessionId: In(scopedIds),
            status: In(SESSION_REPORT_PENDING_SAISIE_STATUSES),
          },
        }),
      ]);
      return {
        missingReports,
        overdueReports: overdue,
        pendingReports,
        submittedPendingValidation: submitted,
        validatedReports: validated,
      };
    }

    const completedSessionIds = await this.sessionRepository
      .createQueryBuilder('s')
      .select('s.id')
      .where('s.company_id = :companyId', { companyId })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [SessionStatus.COMPLETED, SessionStatus.CLOSED],
      })
      .getMany();
    const completedIds = completedSessionIds.map((s) => s.id);
    if (completedIds.length === 0) {
      const [overdue, submitted, validated, pendingReports] = await Promise.all([
        this.sessionReportRepository.count({ where: { companyId, status: 'overdue' } }),
        this.sessionReportRepository.count({ where: { companyId, status: 'submitted' } }),
        this.sessionReportRepository.count({ where: { companyId, status: 'validated' } }),
        this.sessionReportRepository.count({
          where: { companyId, status: In(SESSION_REPORT_PENDING_SAISIE_STATUSES) },
        }),
      ]);
      return {
        missingReports: 0,
        overdueReports: overdue,
        pendingReports,
        submittedPendingValidation: submitted,
        validatedReports: validated,
      };
    }
    const sessionsWithReport = await this.sessionReportRepository
      .createQueryBuilder('r')
      .select('r.session_id')
      .where('r.company_id = :companyId', { companyId })
      .andWhere('r.session_id IN (:...ids)', { ids: completedIds })
      .getRawMany();
    const withReportIds = new Set(sessionsWithReport.map((r) => r.session_id));
    const missingReports = completedIds.filter((id) => !withReportIds.has(id)).length;
    const [overdue, submitted, validated, pendingReports] = await Promise.all([
      this.sessionReportRepository.count({ where: { companyId, status: 'overdue' } }),
      this.sessionReportRepository.count({ where: { companyId, status: 'submitted' } }),
      this.sessionReportRepository.count({ where: { companyId, status: 'validated' } }),
      this.sessionReportRepository.count({
        where: { companyId, status: In(SESSION_REPORT_PENDING_SAISIE_STATUSES) },
      }),
    ]);
    return {
      missingReports,
      overdueReports: overdue,
      pendingReports,
      submittedPendingValidation: submitted,
      validatedReports: validated,
    };
  }

  /** Student performance KPIs: per-student session count and attendance. */
  async getStudentKpis(
    companyId: string,
  ): Promise<Array<{ userId: string; sessionsCount: number; presentCount: number }>> {
    const rows = await this.participantRepository
      .createQueryBuilder('p')
      .innerJoin('sessions', 's', 's.id = p.session_id AND s.company_id = :companyId', {
        companyId,
      })
      .where('p.role = :role', { role: 'student' })
      .select('p.user_id', 'userId')
      .addSelect('COUNT(*)', 'sessionsCount')
      .addSelect(
        'SUM(CASE WHEN p.attendance_status = :present THEN 1 ELSE 0 END)',
        'presentCount',
      )
      .setParameter('present', 'present')
      .groupBy('p.user_id')
      .getRawMany();
    return rows.map((r) => ({
      userId: r.userId,
      sessionsCount: Number(r.sessionsCount),
      presentCount: Number(r.presentCount),
    }));
  }

  /** Tutor performance KPIs: per-tutor session count (distinct) and reports submitted. */
  async getTutorKpis(
    companyId: string,
  ): Promise<
    Array<{ userId: string; sessionsCount: number; reportsSubmittedCount: number }>
  > {
    const sessions = await this.sessionRepository.find({
      where: { companyId },
      select: { id: true, managedById: true },
    });
    const ids = sessions.map((s) => s.id);
    if (ids.length === 0) return [];

    const asParticipant = await this.participantRepository
      .createQueryBuilder('p')
      .where('p.session_id IN (:...ids)', { ids })
      .andWhere('p.role = :role', { role: 'volunteer' })
      .select('p.user_id', 'userId')
      .addSelect('p.session_id', 'sessionId')
      .getRawMany();

    const sessionIdsByUser = new Map<string, Set<string>>();
    for (const s of sessions) {
      if (s.managedById) {
        if (!sessionIdsByUser.has(s.managedById)) {
          sessionIdsByUser.set(s.managedById, new Set());
        }
        sessionIdsByUser.get(s.managedById)!.add(s.id);
      }
    }
    for (const r of asParticipant) {
      if (!sessionIdsByUser.has(r.userId)) {
        sessionIdsByUser.set(r.userId, new Set());
      }
      sessionIdsByUser.get(r.userId)!.add(r.sessionId);
    }
    const sessionCountByUser = new Map<string, number>();
    for (const [userId, set] of sessionIdsByUser) {
      sessionCountByUser.set(userId, set.size);
    }

    const reportCounts = await this.sessionReportRepository
      .createQueryBuilder('r')
      .where('r.company_id = :companyId', { companyId })
      .select('r.author_id', 'userId')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('r.author_id')
      .getRawMany();

    const reportByUser = new Map<string, number>();
    for (const r of reportCounts) {
      reportByUser.set(r.userId, Number(r.cnt));
    }

    const allUserIds = new Set([
      ...sessionCountByUser.keys(),
      ...reportByUser.keys(),
    ]);
    return Array.from(allUserIds).map((userId) => ({
      userId,
      sessionsCount: sessionCountByUser.get(userId) ?? 0,
      reportsSubmittedCount: reportByUser.get(userId) ?? 0,
    }));
  }

  /** Export sessions as Excel (optionally filtered). */
  async exportSessionsCsv(
    companyId: string,
    query?: ListSessionsQueryDto,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<Buffer> {
    const sessions = await this.findAllForExport(companyId, query, userId, roleCodes, visibilityScope);
    const headerRow = [
      'ID session',
      'Date',
      'Heure début',
      'Heure fin',
      'Type',
      'Statut',
      'Établissement',
      'Salle',
      'Année scolaire',
      'Niveau',
      'Matière',
      'Sujet',
      'Notes internes',
      'Participants Élève',
      'Participants Tuteur',
    ];
    const dataRows = sessions.map((s) => [
      s.id,
      formatExportDate(s.sessionDate as Date | string | undefined),
      formatExportTime(s.startTime),
      formatExportTime(s.endTime),
      s.type ?? '',
      s.status ?? '',
      s.establishmentName ?? s.establishment?.name ?? '',
      s.roomName ?? s.room?.name ?? s.room?.label ?? '',
      s.schoolYear?.code ?? '',
      (s.levelNames?.length ? s.levelNames.filter(Boolean).join(', ') : '') || '',
      (s.subjectNames?.length ? s.subjectNames.filter(Boolean).join(', ') : '') || '',
      s.topic ?? '',
      s.internalNotes ?? '',
      formatSessionParticipantsByRoles(s, ['student']),
      formatSessionParticipantsByRoles(s, ['tutor', 'volunteer']),
    ]);
    return buildXlsxBuffer({ sheetName: 'Sessions', headerRow, dataRows });
  }

  /**
   * Export reports as Excel (optionally filtered).
   * Mirrors `findAllReports` filtering + access scoping, but without pagination.
   * Export reports as CSV (optionally filtered).
   * Mirrors `findAllReports` filtering + access scoping (including session-started base filter), but without pagination.
   */
  async exportReportsCsv(
    companyId: string,
    query?: any,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<Buffer> {
    const headerRow = [
      'ID session',
      'Date',
      'Heure début',
      'Heure fin',
      'Type séance',
      'Statut séance',
      'ID établissement',
      'Établissement',
      'Date création rapport',
      'Statut rapport',
      'Note',
      'Matières',
      'Commentaire',
      'Script',
      'Validateur',
      'Date validation',
      'Auteur',
    ];

    const cell = (val: unknown): string => {
      if (val == null) return '';
      return typeof val === 'string' ? val : String(val);
    };

    const emptyExport = () =>
      buildXlsxBuffer({ sheetName: 'Rapports', headerRow, dataRows: [] });

    const qb = this.sessionReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.session', 'session')
      .leftJoinAndSelect('session.establishment', 'establishment')
      .leftJoinAndSelect('report.author', 'author')
      .leftJoinAndSelect('report.validatedBy', 'validatedBy')
      .where('report.companyId = :companyId', { companyId });

    if (visibilityScope !== undefined && visibilityScope !== null) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'reports',
        { userId: userId ?? '', companyId },
      );
    }

    this.applyReportsListSessionStartedFilter(qb);

    if (query?.statuses?.length) qb.andWhere('report.status IN (:...statuses)', { statuses: query.statuses });
    if (query?.ratings?.length) this.applyReportRatingsFilter(qb, query.ratings);
    if (query?.dateFrom) qb.andWhere('report.createdAt >= :dateFrom', { dateFrom: parseLocalDate(query.dateFrom) });
    if (query?.dateTo) qb.andWhere('report.createdAt <= :dateTo', { dateTo: parseLocalDateEndOfDay(query.dateTo) });
    if (query?.sessionTypes?.length) qb.andWhere('session.type IN (:...types)', { types: query.sessionTypes });
    if (query?.establishmentIds?.length) qb.andWhere('session.establishmentId IN (:...establishmentIds)', { establishmentIds: query.establishmentIds });
    if (query?.tutorId) qb.andWhere('session.managedById = :tutorId', { tutorId: query.tutorId });
    if (query?.participantId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = session.id AND sp.user_id = :participantId)',
        { participantId: query.participantId },
      );
    }
    if (query?.sessionId) qb.andWhere('report.sessionId = :sessionId', { sessionId: query.sessionId });
    if (query?.search) {
      this.applyReportTextSearchFilter(qb, `%${query.search}%`, 'searchParamReport');
    }

    qb.orderBy('report.createdAt', 'DESC');

    const reports = await qb.getMany();
    const allReportSubjectIds = [...new Set(reports.flatMap((r) => r.subjectIds ?? []))];
    const idToLabel = await this.getSubjectIdLabelMap(companyId, allReportSubjectIds);

    const matiereCell = (r: SessionReport): string => {
      if (r.subjectIds?.length) {
        return r.subjectIds.map((id) => idToLabel.get(id) ?? id).join(', ');
      }
      return r.subject ?? '';
    };

    const rows = reports.map((r) => {
      const s: any = r.session;
      const sessionDate = formatExportDate(s?.sessionDate as Date | string | undefined);
      const sessionStatus = s ? getEffectiveStatus(s) : '';
      const establishmentId = s?.establishmentId ?? '';
      const establishmentName = s?.establishment?.name ?? s?.establishmentName ?? '';

      const validatedAtFormatted = formatExportDate(r.validatedAt);

      return [
        cell(r.sessionId),
        sessionDate,
        formatExportTime(s?.startTime),
        formatExportTime(s?.endTime),
        cell(s?.type ?? ''),
        cell(sessionStatus),
        cell(establishmentId),
        cell(establishmentName),
        formatExportDate(r.createdAt),
        cell(r.status),
        cell(getDisplayAuthorFeedback(r)?.rating ?? ''),
        matiereCell(r),
        cell(getDisplayAuthorFeedback(r)?.comment ?? ''),
        cell(r.script ?? ''),
        formatReportValidatorDisplay(r),
        validatedAtFormatted,
        cell(r.authorName ?? ''),
      ];
    });

    return buildXlsxBuffer({ sheetName: 'Rapports', headerRow, dataRows: rows });
  }

  // POC-328: Export Excel reports
  async exportReportsExcel(
    companyId: string,
    query?: any,
    userId?: string,
    roleCodes?: string[],
  ): Promise<Buffer> {
    // Réutiliser la logique pour obtenir les données
    const qb = this.sessionReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.session', 'session')
      .leftJoinAndSelect('session.establishment', 'establishment')
      .leftJoinAndSelect('report.author', 'author')
      .where('report.companyId = :companyId', { companyId });

    if (query?.statuses?.length) qb.andWhere('report.status IN (:...statuses)', { statuses: query.statuses });
    if (query?.ratings?.length) this.applyReportRatingsFilter(qb, query.ratings);
    if (query?.dateFrom) qb.andWhere('report.createdAt >= :dateFrom', { dateFrom: parseLocalDate(query.dateFrom) });
    if (query?.dateTo) qb.andWhere('report.createdAt <= :dateTo', { dateTo: parseLocalDateEndOfDay(query.dateTo) });
    if (query?.sessionTypes?.length) qb.andWhere('session.type IN (:...types)', { types: query.sessionTypes });
    if (query?.establishmentIds?.length) qb.andWhere('session.establishmentId IN (:...establishmentIds)', { establishmentIds: query.establishmentIds });
    if (query?.tutorId) qb.andWhere('session.managedById = :tutorId', { tutorId: query.tutorId });
    if (query?.participantId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = session.id AND sp.user_id = :participantId)',
        { participantId: query.participantId },
      );
    }
    if (query?.sessionId) qb.andWhere('report.sessionId = :sessionId', { sessionId: query.sessionId });
    if (query?.search) {
      this.applyReportTextSearchFilter(qb, `%${query.search}%`, 'searchParamReport');
    }

    qb.orderBy('report.createdAt', 'DESC');
    const reports = await qb.getMany();
    const allReportSubjectIds = [...new Set(reports.flatMap((r) => r.subjectIds ?? []))];
    const idToLabel = await this.getSubjectIdLabelMap(companyId, allReportSubjectIds);
    const matiereCell = (r: SessionReport): string => {
      if (r.subjectIds?.length) {
        return r.subjectIds.map((id) => idToLabel.get(id) ?? id).join(', ');
      }
      return r.subject ?? '';
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Comptes rendus');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Session ID', key: 'sessionId', width: 36 },
      { header: 'Date séance', key: 'sessionDate', width: 12 },
      { header: 'Heure début', key: 'startTime', width: 10 },
      { header: 'Heure fin', key: 'endTime', width: 10 },
      { header: 'Type', key: 'sessionType', width: 20 },
      { header: 'Statut séance', key: 'sessionStatus', width: 15 },
      { header: 'Établissement ID', key: 'establishmentId', width: 36 },
      { header: 'Établissement', key: 'establishmentName', width: 30 },
      { header: 'Créé le', key: 'reportCreatedAt', width: 20 },
      { header: 'Statut', key: 'reportStatus', width: 12 },
      { header: 'Note', key: 'rating', width: 8 },
      { header: 'Matières', key: 'subject', width: 30 },
      { header: 'Commentaire', key: 'comment', width: 50 },
      { header: 'Script', key: 'script', width: 50 },
      { header: 'Validé par ID', key: 'validatedById', width: 36 },
      { header: 'Validé le', key: 'validatedAt', width: 20 },
      { header: 'Auteur ID', key: 'authorId', width: 36 },
      { header: 'Auteur', key: 'authorName', width: 30 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    reports.forEach((r) => {
      const s: any = r.session;
      const sessionDate =
        s?.sessionDate instanceof Date
          ? s.sessionDate.toISOString().slice(0, 10)
          : s?.sessionDate
            ? String(s.sessionDate).slice(0, 10)
            : '';
      const sessionStatus = s ? getEffectiveStatus(s) : '';
      const establishmentName = s?.establishment?.name ?? s?.establishmentName ?? '';
      const validatedAt = r.validatedAt instanceof Date ? r.validatedAt.toISOString() : r.validatedAt ? String(r.validatedAt) : '';

      worksheet.addRow({
        id: r.id,
        sessionId: r.sessionId,
        sessionDate,
        startTime: s?.startTime ?? '',
        endTime: s?.endTime ?? '',
        sessionType: s?.type ?? '',
        sessionStatus,
        establishmentId: s?.establishmentId ?? '',
        establishmentName,
        reportCreatedAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt ?? '',
        reportStatus: r.status,
        rating: getDisplayAuthorFeedback(r)?.rating ?? '',
        subject: matiereCell(r),
        comment: getDisplayAuthorFeedback(r)?.comment ?? '',
        script: r.script ?? '',
        validatedById: r.validatedById ?? '',
        validatedAt,
        authorId: r.authorId,
        authorName: r.author ? `${r.author.firstName ?? ''} ${r.author.lastName ?? ''}`.trim() : '',
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Export VSC reports as Excel (optionally filtered).
   * Mirrors `findAllVscReports` filtering + access scoping, but without pagination.
   */
  async exportVscReportsCsv(
    companyId: string,
    query?: any,
    userId?: string,
    roleCodes?: string[],
  ): Promise<Buffer> {
    const headerRow = [
      'ID VSC',
      'Statut',
      'Catégorie',
      'Date',
      'Séance',
      'Établissement',
      'Élève',
      'Date création',
      'Début période',
      'Fin période',
      'Résumé',
      'Évaluation progrès',
      'Recommandations',
      'Séances terminées',
      'Séances fermées',
      'Séances annulées',
      'Affectations créées',
      'CR soumis',
      'CR en attente',
      'CR validés',
      'Heures tuteur',
    ];

    const cell = (val: unknown): string | number => {
      if (val == null) return '';
      if (typeof val === 'number') return val;
      return typeof val === 'string' ? val : String(val);
    };

    const emptyExport = () =>
      buildXlsxBuffer({ sheetName: 'Rapports VSC', headerRow, dataRows: [] });

    const qb = this.vscReportRepository
      .createQueryBuilder('vsc_report')
      .leftJoinAndSelect('vsc_report.session', 'session')
      .leftJoinAndSelect('session.establishment', 'establishment')
      .leftJoinAndSelect('vsc_report.establishment', 'reportEstablishment')
      .where('vsc_report.companyId = :companyId', { companyId });

    if (query?.statuses?.length) qb.andWhere('vsc_report.status IN (:...statuses)', { statuses: query.statuses });
    if (query?.categories?.length) qb.andWhere('vsc_report.category IN (:...categories)', { categories: query.categories });
    if (query?.dateFrom) qb.andWhere('vsc_report.createdAt >= :dateFrom', { dateFrom: parseLocalDate(query.dateFrom) });
    if (query?.dateTo) qb.andWhere('vsc_report.createdAt <= :dateTo', { dateTo: parseLocalDateEndOfDay(query.dateTo) });
    if (query?.userId) {
      qb.andWhere(
        '(vsc_report.volunteerId = :userId OR vsc_report.vscId = :userId)',
        { userId: query.userId },
      );
    }
    if (query?.sessionId) qb.andWhere('vsc_report.sessionId = :sessionId', { sessionId: query.sessionId });
    if (query?.establishmentId) {
      qb.andWhere('vsc_report.establishmentId = :establishmentId', { establishmentId: query.establishmentId });
    }
    if (query?.search) qb.andWhere('vsc_report.content ILIKE :search', { search: `%${query.search}%` });

    if (this.hasRole(roleCodes, 'VOLUNTEER', 'VSC') && query?.userId) {
      qb.andWhere(
        '(vsc_report.volunteerId = :userId OR vsc_report.vscId = :userId)',
        { userId: query.userId },
      );
    }

    qb.orderBy('vsc_report.createdAt', 'DESC');

    const reports = await qb.getMany();

    const rows = reports.map((r) => {
      const establishmentName =
        r.session?.establishment?.name?.trim() || r.establishment?.name?.trim() || '';
      const eleve = r.studentName?.trim() ?? '';
      return [
        cell(r.vscId ?? ''),
        formatVscExportStatusLabel(r.status),
        formatVscExportCategoryLabel(r.category ?? undefined),
        formatExportDate(r.createdAt),
        formatVscExportSessionLine(r),
        establishmentName,
        eleve,
        formatExportDate(r.createdAt),
        formatExportDate(r.periodStart as Date | string | undefined),
        formatExportDate(r.periodEnd as Date | string | undefined),
        cell(r.summary ?? ''),
        cell(r.progressEvaluation ?? ''),
        cell(r.recommendations ?? ''),
        cell(r.sessionsCompleted ?? 0),
        cell(r.sessionsClosed ?? 0),
        cell(r.sessionsCancelled ?? 0),
        cell(r.assignmentsCreated ?? 0),
        cell(r.reportsSubmitted ?? 0),
        cell(r.reportsPending ?? 0),
        cell(r.reportsValidated ?? 0),
        cell(r.tutorHours ?? 0),
      ];
    });

    return buildXlsxBuffer({ sheetName: 'Rapports VSC', headerRow, dataRows: rows });
  }

  // --- Participants ---
  /**
   * Evaluates if a student should be promoted to 'accompanied' or reverted to 'registered'
   * based on their cumulative session participations (present or pending).
   */
  private async evaluateStudentStatusTransition(
    userId: string,
    companyId: string,
    role: string,
    actorId?: string | null,
  ): Promise<void> {
    if (role !== 'student') return;

    const user = await this.userRepository.findOne({ where: { id: userId, companyId } });
    if (!user) return;

    // Only automate transitions for students who are currently 'registered' or 'accompanied'
    if (user.status !== 'registered' && user.status !== 'accompanied') return;

    const today = new Date().toISOString().split('T')[0];
    const threshold = this.studentAccompaniedMinPresent;

    // Count sessions that are 'present' or 'pending' up to today
    const count = await this.participantRepository
      .createQueryBuilder('participant')
      .innerJoin('participant.session', 'session')
      .where('participant.userId = :userId', { userId })
      .andWhere('participant.role = :role', { role: 'student' })
      .andWhere('participant.attendanceStatus IN (:...statuses)', { statuses: ['present', 'pending'] })
      .andWhere('session.sessionDate <= :today', { today })
      .getCount();

    const previousStatus = user.status;
    let newStatus = user.status;

    if (user.status === 'registered' && count >= threshold) {
      newStatus = 'accompanied';
    } else if (user.status === 'accompanied' && count < threshold) {
      newStatus = 'registered';
    }

    if (newStatus !== previousStatus) {
      user.status = newStatus as any;
      await this.userRepository.save(user);

      await this.usersService.recordStudentAccountStatusChange(
        companyId,
        userId,
        actorId ?? null,
        previousStatus as any,
        newStatus as any,
        'auto_present_sessions',
      );

      this.logger.log(
        `[StatusTransition] Student ${userId} transitioned from ${previousStatus} to ${newStatus} (count: ${count})`,
      );
    }
  }

  async findParticipants(
    sessionId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionParticipant[]> {
    await this.findOneSession(sessionId, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    return this.participantRepository.find({
      where: { sessionId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async createParticipant(
    sessionId: string,
    companyId: string,
    dto: CreateSessionParticipantDto,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionParticipant> {
    await this.findOneSession(sessionId, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    const existing = await this.participantRepository.findOne({
      where: { sessionId, userId: dto.userId },
    });
    if (existing) throw new ConflictException('User already participant in this session');
    const entity = this.participantRepository.create({
      ...dto,
      sessionId,
      matchedAt: dto.matchedAt ? new Date(dto.matchedAt) : null,
    });
    const saved = await this.participantRepository.save(entity);
    if (saved.attendanceStatus === 'present') {
      const session = await this.findOneSession(sessionId, companyId);
      if (session.status === SessionStatus.PLANNED) {
        await this.applySessionStatusTransition(
          session,
          SessionStatus.IN_PROGRESS,
          'attendance',
          actorId ?? undefined,
        );
      }
      await this.evaluateStudentStatusTransition(saved.userId, companyId, saved.role, actorId);
    }
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_participants',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findOneParticipant(
    sessionId: string,
    participantId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionParticipant> {
    await this.findOneSession(sessionId, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    const p = await this.participantRepository.findOne({
      where: { id: participantId, sessionId },
    });
    if (!p) throw new NotFoundException(`Participant ${participantId} not found`);
    return p;
  }

  async updateParticipant(
    sessionId: string,
    participantId: string,
    companyId: string,
    dto: UpdateSessionParticipantDto,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
    opts?: { skipEndedSessionAttendanceGuard?: boolean },
  ): Promise<SessionParticipant> {
    const p = await this.findOneParticipant(sessionId, participantId, companyId, userId, roleCodes);
    const session = await this.findOneSession(sessionId, companyId);
    const effectiveStatus = getEffectiveStatus(session);

    const isAttendanceUpdate =
      dto.attendanceStatus !== undefined ||
      dto.absenceJustification !== undefined ||
      dto.absenceComment !== undefined;

    // POC-346: attendance is editable until the session report (CR) is validated (regardless of session status).
    if (isAttendanceUpdate) {
      const report = await this.sessionReportRepository.findOne({
        where: { companyId, sessionId },
        select: { id: true, status: true, validatedById: true },
      });
      const isCrValidated = report?.status === 'validated' || report?.validatedById != null;
      if (isCrValidated) {
        throw new ForbiddenException(
          "Le compte rendu est validé. Les présences ne peuvent plus être modifiées.",
        );
      }
    }
   
    const oldValue = { ...p } as unknown as Record<string, unknown>;
    Object.assign(p, {
      ...dto,
      matchedAt: dto.matchedAt !== undefined ? (dto.matchedAt ? new Date(dto.matchedAt) : null) : p.matchedAt,
    });
    const saved = await this.participantRepository.save(p);
    if (saved.attendanceStatus === 'present') {
      if (session.status === SessionStatus.PLANNED) {
        await this.applySessionStatusTransition(
          session,
          SessionStatus.IN_PROGRESS,
          'attendance',
          actorId ?? undefined,
        );
      }
      await this.evaluateStudentStatusTransition(saved.userId, session.companyId, saved.role, actorId);
    } else if (saved.attendanceStatus === 'absent' || saved.attendanceStatus === 'excused') {
      await this.evaluateStudentStatusTransition(saved.userId, session.companyId, saved.role, actorId);
    }
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_participants',
      entityId: participantId,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    const withUser = await this.participantRepository.findOne({
      where: { id: saved.id, sessionId },
      relations: ['user'],
    });
    return withUser ?? saved;
  }

  async removeParticipant(
    sessionId: string,
    participantId: string,
    companyId: string,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<void> {
    const p = await this.findOneParticipant(sessionId, participantId, companyId, userId, roleCodes);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_participants',
      entityId: participantId,
      action: 'DELETE',
      oldValue: { id: p.id } as Record<string, unknown>,
    });
    await this.participantRepository.delete(participantId);
  }

  // --- Session reports (one per session) ---

  private applyReportRatingsFilter(
    qb: SelectQueryBuilder<SessionReport>,
    ratings: number[],
  ): void {
    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM jsonb_array_elements(report.author_feedbacks) elem
        WHERE (elem->>'rating')::int IN (:...ratings)
      )`,
      { ratings },
    );
  }

  private applyReportTextSearchFilter(
    qb: SelectQueryBuilder<SessionReport>,
    searchParam: string,
    paramKey: string,
  ): void {
    qb.andWhere(
      `(
        EXISTS (
          SELECT 1 FROM session_participants sp
          JOIN users up ON up.id = sp.user_id
          WHERE sp.session_id = report.session_id
            AND (up.first_name ILIKE :${paramKey}
              OR up.last_name ILIKE :${paramKey}
              OR CONCAT(up.first_name, ' ', up.last_name) ILIKE :${paramKey})
        )
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(report.author_feedbacks) elem
          WHERE elem->>'comment' ILIKE :${paramKey}
        )
        OR report.script ILIKE :${paramKey}
        OR report.subject ILIKE :${paramKey}
      )`,
      { [paramKey]: searchParam },
    );
  }

  private async resolveSessionReportAuthorFeedbacks(
    session: Session,
    reportAuthorId: string,
    existing: SessionReportAuthorFeedback[] | null | undefined,
    patch: SessionReportAuthorFeedbackDto[] | undefined,
    actorId: string | undefined,
    roleCodes: string[] | undefined,
  ): Promise<SessionReportAuthorFeedback[]> {
    const participants = await this.participantRepository.find({
      where: { sessionId: session.id },
      select: ['userId', 'role'],
    });
    let authorIds = getNonStudentAuthorIds(session, participants, reportAuthorId);
    if (authorIds.length === 0) {
      authorIds = [reportAuthorId];
    }
    let skeleton = buildAuthorFeedbackSkeleton(authorIds, existing);
    if (patch?.length) {
      const effectiveActor = actorId ?? reportAuthorId;
      skeleton = mergeAuthorFeedbackUpdate(
        skeleton,
        patch as SessionReportAuthorFeedback[],
        effectiveActor,
        isPrivilegedSessionReportEditor(roleCodes),
      );
    }
    assertAuthorFeedbacksShape(authorIds, skeleton);
    return skeleton;
  }

  private async emptyAuthorFeedbacksForSession(
    session: Pick<Session, 'id' | 'type' | 'managedById' | 'createdById'>,
    authorId: string,
  ): Promise<SessionReportAuthorFeedback[]> {
    const participants = await this.participantRepository.find({
      where: { sessionId: session.id },
      select: ['userId', 'role'],
    });
    const authorIds = getNonStudentAuthorIds(session, participants, authorId);
    return buildAuthorFeedbackSkeleton(authorIds.length > 0 ? authorIds : [authorId]);
  }

  /**
   * Base filter for GET /sessions/reports (JSON + CSV): only reports whose session has already
   * reached its scheduled start in the company timezone (start <= now). Includes past sessions
   * and sessions currently in progress; excludes future sessions. Does not use session.status.
   * Applied regardless of other query filters.
   */
  private applyReportsListSessionStartedFilter(qb: SelectQueryBuilder<SessionReport>): void {
    qb.leftJoin('companies', 'session_company', 'session_company.id = session.company_id');
    qb.andWhere(
      `(
        ((session.session_date::text || ' ' || trim(both from session.start_time::text))::timestamp
         AT TIME ZONE COALESCE(session_company.timezone, 'Europe/Paris'))
        <= NOW()
      )`,
    );
  }

  /** List all session reports for the company (e.g. for Comptes Rendus page). */
  async findAllReports(
    companyId: string,
    query: any,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<PaginatedResponse<SessionReport>> {
    const { page = 1, pageSize = 20 } = query;
    const { skip, take } = getSkipTake(page, pageSize);
    
    const qb = this.sessionReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.session', 'session')
      .leftJoinAndSelect('session.establishment', 'establishment')
      .leftJoinAndSelect('report.author', 'author')
      .where('report.companyId = :companyId', { companyId });

    if (visibilityScope !== undefined && visibilityScope !== null) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'reports',
        { userId: userId ?? '', companyId },
      );
    }

    this.applyReportsListSessionStartedFilter(qb);
    
    if (query.statuses?.length) {
      qb.andWhere('report.status IN (:...statuses)', { statuses: query.statuses });
    }
    if (query.ratings?.length) {
      this.applyReportRatingsFilter(qb, query.ratings);
    }
    if (query.dateFrom) {
      qb.andWhere('report.createdAt >= :dateFrom', { dateFrom: parseLocalDate(query.dateFrom) });
    }
    if (query.dateTo) {
      qb.andWhere('report.createdAt <= :dateTo', { dateTo: parseLocalDateEndOfDay(query.dateTo) });
    }
    if (query.sessionTypes?.length) {
      qb.andWhere('session.type IN (:...types)', { types: query.sessionTypes });
    }
    if (query.establishmentIds?.length) {
      qb.andWhere('session.establishmentId IN (:...establishmentIds)', { establishmentIds: query.establishmentIds });
    }
    if (query.tutorId) {
      qb.andWhere('session.managedById = :tutorId', { tutorId: query.tutorId });
    }
    if (query.participantId) {
      qb.andWhere('EXISTS (SELECT 1 FROM session_participants sp WHERE sp.session_id = session.id AND sp.user_id = :participantId)', { participantId: query.participantId });
    }
    if (query.sessionId) {
      qb.andWhere('report.sessionId = :sessionId', { sessionId: query.sessionId });
    }
    if (query.search) {
      this.applyReportTextSearchFilter(qb, `%${query.search}%`, 'searchParam');
    }
    
    qb.orderBy('report.createdAt', 'DESC')
      .skip(skip)
      .take(take);
    
    const [data, total] = await qb.getManyAndCount();
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findReports(
    sessionId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionReport[]> {
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    return this.sessionReportRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  private async applySessionReportParticipantAttendance(
    sessionId: string,
    companyId: string,
    items: SessionReportParticipantAttendanceItemDto[] | undefined,
    actorId: string | undefined,
    userId: string | undefined,
    roleCodes: string[] | undefined,
  ): Promise<void> {
    if (!items?.length) return;
    for (const item of items) {
      await this.updateParticipant(
        sessionId,
        item.participantId,
        companyId,
        {
          attendanceStatus: item.attendanceStatus,
          absenceJustification: item.absenceJustification,
          absenceComment: item.absenceComment,
        },
        actorId,
        userId,
        roleCodes,
        { skipEndedSessionAttendanceGuard: true },
      );
    }
  }

  async createSessionReport(
    sessionId: string,
    companyId: string,
    dto: CreateSessionReportDto,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionReport> {
    const session = await this.findOneSession(sessionId, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    const existing = await this.sessionReportRepository.findOne({ where: { sessionId, companyId } });
    if (existing) throw new ConflictException('Session report already exists for this session');
    await this.assertSessionReportSubjectIds(companyId, session, dto.subjectIds);
    const { participants, authorFeedbacks: authorFeedbacksPatch, ...reportFields } = dto;
    const authorFeedbacks = await this.resolveSessionReportAuthorFeedbacks(
      session,
      dto.authorId,
      null,
      authorFeedbacksPatch,
      actorId,
      roleCodes,
    );
    const entity = this.sessionReportRepository.create({
      ...reportFields,
      sessionId,
      companyId,
      authorFeedbacks,
    });
    if (entity.subjectIds?.length) {
      const names = await this.resolveSubjectNames(entity.subjectIds, companyId);
      entity.subject = names.filter(Boolean).join(', ').slice(0, 255) || null;
    }
    const saved = await this.sessionReportRepository.save(entity);
    await this.applySessionReportParticipantAttendance(
      sessionId,
      companyId,
      participants,
      actorId,
      userId,
      roleCodes,
    );
    await this.maybeAwardCrFirstSubmitXpOnSubmitted({
      sessionId,
      companyId,
      reportId: saved.id,
      previousStatus: 'to_complete',
      newStatus: saved.status,
      actorId,
    });
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_reports',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  /** Returns the session report for this session if it exists (for AI create-or-update flow). */
  async findSessionReportBySession(
    sessionId: string,
    companyId: string,
  ): Promise<SessionReport | null> {
    return this.sessionReportRepository.findOne({
      where: { sessionId, companyId },
    });
  }

  async findOneSessionReport(
    sessionId: string,
    reportId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionReport> {
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    const r = await this.sessionReportRepository.findOne({
      where: { id: reportId, sessionId, companyId },
    });
    if (!r) throw new NotFoundException(`Session report ${reportId} not found`);
    return r;
  }

  async updateSessionReport(
    sessionId: string,
    reportId: string,
    companyId: string,
    dto: UpdateSessionReportDto,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
    writeScope?: VisibilityScope | null,
  ): Promise<SessionReport> {
    if (userId && roleCodes && writeScope !== undefined) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes, writeScope);
    }
    const r = await this.findOneSessionReport(sessionId, reportId, companyId, userId, roleCodes);
    const oldValue = { ...r } as unknown as Record<string, unknown>;
    const previousStatus = r.status;
    const { participants, authorFeedbacks: authorFeedbacksPatch, ...reportDto } = dto;
    await this.applySessionReportParticipantAttendance(
      sessionId,
      companyId,
      participants,
      actorId,
      userId,
      roleCodes,
    );

    const session = await this.findOneSession(sessionId, companyId);
    if (dto.subjectIds !== undefined) {
      await this.assertSessionReportSubjectIds(companyId, session, dto.subjectIds);
    }

    const effectiveActorId = actorId ?? r.authorId;
    r.authorFeedbacks = await this.resolveSessionReportAuthorFeedbacks(
      session,
      r.authorId,
      r.authorFeedbacks,
      authorFeedbacksPatch,
      effectiveActorId,
      roleCodes,
    );

    Object.assign(r, reportDto);

    if (dto.subjectIds !== undefined) {
      if (dto.subjectIds.length) {
        const names = await this.resolveSubjectNames(dto.subjectIds, companyId);
        r.subject = names.filter(Boolean).join(', ').slice(0, 255) || null;
      } else {
        r.subject = null;
      }
    }

    if (!dto.status && (r.status === 'to_complete' || r.status === 'draft')) {
      const actorEntry = r.authorFeedbacks.find((e) => e.idAuteur === effectiveActorId);
      const patchEntry = authorFeedbacksPatch?.find((e) => e.idAuteur === effectiveActorId);
      const hasAnyData =
        hasActorFeedbackData(patchEntry as SessionReportAuthorFeedback | undefined) ||
        hasActorFeedbackData(actorEntry) ||
        (Array.isArray(dto.subjectIds) && dto.subjectIds.length > 0) ||
        !!dto.subject?.trim();
      const isComplete = isActorFeedbackComplete(r, effectiveActorId);

      if (isComplete) {
        r.status = 'submitted';
      } else if (hasAnyData && r.status === 'to_complete') {
        r.status = 'draft';
      }
    }
    
    if (dto.validatedById !== undefined) {
      r.validatedById = dto.validatedById;
      if (dto.validatedById) r.validatedAt = new Date();
    }

    // Maintain `to_complete_since` anchor used by the reminder scheduler.
    if (r.status === 'to_complete' && previousStatus !== 'to_complete') {
      r.toCompleteSince = new Date();
      r.reminder24hSentAt = null;
      r.reminder96hSentAt = null;
    } else if (r.status !== 'to_complete' && previousStatus === 'to_complete') {
      r.toCompleteSince = null;
    }

    const saved = await this.sessionReportRepository.save(r);
    await this.maybeAwardCrFirstSubmitXpOnSubmitted({
      sessionId,
      companyId,
      reportId: saved.id,
      previousStatus,
      newStatus: saved.status,
      actorId,
    });
    const isCrValidated = saved.status === 'validated' || saved.validatedById != null;
    if (isCrValidated) {
      const session = await this.findOneSession(sessionId, companyId);
      if (session.status === SessionStatus.IN_PROGRESS) {
        await this.applySessionStatusTransition(
          session,
          SessionStatus.CLOSED,
          'cr_validation',
          actorId ?? undefined,
        );
      }
      if (previousStatus !== 'validated') {
        await this.notifyTutorsOfReportValidation(saved, session);
      }
    }
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_reports',
      entityId: reportId,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async validateSessionReport(
    sessionId: string,
    reportId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
    writeScope?: VisibilityScope | null,
  ): Promise<SessionReport> {
    if (userId && roleCodes && writeScope !== undefined) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes, writeScope);
    }
    // POC-300: Seul le volunteer peut valider les comptes-rendus de séance
    if (!this.hasRole(roleCodes, 'VOLUNTEER')) {
      throw new ForbiddenException('Only volunteers can validate session reports');
    }
    
    const report = await this.findOneSessionReport(sessionId, reportId, companyId, userId, roleCodes);
    
    if (report.status !== 'submitted') {
      throw new BadRequestException('Only submitted reports can be validated');
    }
    
    const oldValue = { ...report } as unknown as Record<string, unknown>;
    report.status = 'validated';
    report.validatedById = userId || null;
    report.validatedAt = new Date();
    
    const saved = await this.sessionReportRepository.save(report);
    
    // Transition session vers CLOSED si en IN_PROGRESS
    const session = await this.findOneSession(sessionId, companyId);
    if (session.status === SessionStatus.IN_PROGRESS) {
      await this.applySessionStatusTransition(
        session,
        SessionStatus.CLOSED,
        'cr_validation',
        userId ?? undefined,
      );
    }

    // Notifier les tuteurs participants de la séance que le CR a été validé.
    await this.notifyTutorsOfReportValidation(saved, session);

    await this.auditLogService.log({
      companyId,
      userId,
      entity: 'session_reports',
      entityId: reportId,
      action: 'UPDATE',
      oldValue,
      newValue: { status: 'validated', validatedById: userId } as unknown as Record<string, unknown>,
    });
    
    return saved;
  }

  /** `HH:mm` from DB time string (e.g. `14:00:00`). */
  private formatSessionTimeHm(time: string | null | undefined): string {
    if (!time?.trim()) return '';
    const t = time.trim();
    return t.length >= 5 ? t.slice(0, 5) : t;
  }

  /** French numeric date `dd/MM/yyyy` from session `session_date`. */
  private formatSessionDateFr(sessionDate: Date | string | null | undefined): string {
    if (sessionDate == null) return '';
    const ymd =
      sessionDate instanceof Date
        ? sessionDate.toISOString().slice(0, 10)
        : String(sessionDate).slice(0, 10);
    const parts = ymd.split('-').map((x) => Number.parseInt(x, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return ymd;
    const [y, m, d] = parts;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  /**
   * Human-readable line for tutor notifications: date, time, établissement, matière (optional).
   * Does not rely on `sessionDisplayName` (often missing → misleading establishment-only fallback).
   */
  private buildTutorReportValidatedNotificationBody(
    report: SessionReport,
    session: Session,
    matiereLine: string,
  ): { body: string; payload: Record<string, unknown> } {
    const dateStr = this.formatSessionDateFr(session.sessionDate);
    const timeStr = this.formatSessionTimeHm(session.startTime);
    const establishment =
      session.establishment?.name?.trim() ||
      session.establishmentName?.trim() ||
      '';
    const subjectFromSession =
      Array.isArray(session.subjectNames) && session.subjectNames.length > 0
        ? session.subjectNames.filter((n): n is string => Boolean(n?.trim())).join(', ')
        : '';
    const subject = matiereLine || subjectFromSession;

    const ymdIso =
      session.sessionDate instanceof Date
        ? session.sessionDate.toISOString().slice(0, 10)
        : String(session.sessionDate ?? '').slice(0, 10);

    const payload: Record<string, unknown> = {
      sessionId: report.sessionId,
      reportId: report.id,
      sessionDate: ymdIso || null,
      startTime: session.startTime ?? null,
      endTime: session.endTime ?? null,
      establishmentName: establishment || null,
      subject: subject || null,
      subjectIds: report.subjectIds?.length ? report.subjectIds : null,
    };

    if (!dateStr && !timeStr && !establishment && !subject) {
      const fallback = report.sessionDisplayName?.trim();
      return {
        body: fallback
          ? `Le compte rendu de la séance « ${fallback} » a été validé.`
          : 'Le compte rendu d’une séance à laquelle vous participez a été validé.',
        payload,
      };
    }

    const bits: string[] = [];
    if (dateStr) bits.push(`du ${dateStr}`);
    if (timeStr) bits.push(`à ${timeStr}`);
    const whenWhere = bits.join(' ');

    let body: string;
    if (whenWhere) {
      body = `Le compte rendu de la séance ${whenWhere}`;
      if (establishment) body += ` — ${establishment}`;
      if (subject) body += ` · ${subject}`;
      body += ' a été validé.';
    } else if (establishment) {
      body = `Le compte rendu de la séance à ${establishment}`;
      if (subject) body += ` · ${subject}`;
      body += ' a été validé.';
    } else {
      body = `Le compte rendu${subject ? ` (${subject})` : ''} a été validé.`;
    }
    return { body, payload };
  }

  /**
   * Emits `SESSION_REPORT_VALIDATED_TUTOR` notifications for each tutor participant of the session.
   * Idempotent per report via dedupeKey = `report:<reportId>`.
   */
  private async notifyTutorsOfReportValidation(
    report: SessionReport,
    session: Session,
  ): Promise<void> {
    try {
      const tutors = await this.participantRepository.find({
        where: { sessionId: report.sessionId, role: 'tutor' },
      });
      if (tutors.length === 0) return;
      const fromIds = report.subjectIds?.length
        ? (await this.resolveSubjectNames(report.subjectIds, report.companyId)).filter(Boolean).join(', ')
        : '';
      const matiereLine = (fromIds || report.subject?.trim() || '') as string;
      const { body, payload } = this.buildTutorReportValidatedNotificationBody(
        report,
        session,
        matiereLine,
      );
      await Promise.all(
        tutors.map((t) =>
          this.notifications.createIfNotDuplicate({
            companyId: report.companyId,
            userId: t.userId,
            type: 'SESSION_REPORT_VALIDATED_TUTOR',
            title: 'Compte rendu validé',
            body,
            payload,
            dedupeKey: `report:${report.id}`,
          }),
        ),
      );
    } catch (err) {
      // Notifications must never break the core flow.
      this.logger.warn(
        `notifyTutorsOfReportValidation failed for report=${report.id}: ${(err as Error).message}`,
      );
    }
  }

  // POC-323: Validation VSC reports
  async validateVscReport(
    sessionId: string,
    reportId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<VscReport> {
    // Vérifier que l'utilisateur est coordinator, admin ou manager
    if (!this.hasRole(roleCodes, 'COORDINATOR') && !this.hasRole(roleCodes, 'admin') && !this.hasRole(roleCodes, 'manager')) {
      throw new ForbiddenException('Only coordinator, admin, or manager can validate VSC reports');
    }

    const report = await this.vscReportRepository.findOne({
      where: { id: reportId, companyId, sessionId },
    });

    if (!report) {
      throw new NotFoundException('VSC report not found');
    }

    if (report.status !== 'submitted') {
      throw new BadRequestException('Only submitted reports can be validated');
    }

    const oldValue = { ...report } as unknown as Record<string, unknown>;
    report.status = 'validated';
    report.validatedBy = userId || null;
    report.validatedAt = new Date();

    const saved = await this.vscReportRepository.save(report);

    await this.auditLogService.log({
      companyId,
      userId,
      entity: 'vsc_reports',
      entityId: reportId,
      action: 'UPDATE',
      oldValue,
      newValue: { status: 'validated', validatedBy: userId } as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async removeSessionReport(
    sessionId: string,
    reportId: string,
    companyId: string,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    if (userId && roleCodes && writeScope !== undefined) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes, writeScope);
    }
    const r = await this.findOneSessionReport(sessionId, reportId, companyId, userId, roleCodes);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_reports',
      entityId: reportId,
      action: 'DELETE',
      oldValue: { id: r.id } as Record<string, unknown>,
    });
    await this.sessionReportRepository.delete(reportId);
  }

  // --- VSC reports ---
  async findAllVscReports(
    companyId: string,
    query: any,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<PaginatedResponse<VscReport>> {
    const { page = 1, pageSize = 20 } = query;
    const { skip, take } = getSkipTake(page, pageSize);
    
    const qb = this.vscReportRepository
      .createQueryBuilder('vsc_report')
      .leftJoinAndSelect('vsc_report.session', 'session')
      .leftJoinAndSelect('vsc_report.vsc', 'vsc')
      .where('vsc_report.companyId = :companyId', { companyId });

    if (visibilityScope !== undefined && visibilityScope !== null) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'vscReports',
        { userId: userId ?? '', companyId },
      );
    }

    if (query.statuses?.length) {
      qb.andWhere('vsc_report.status IN (:...statuses)', { statuses: query.statuses });
    }
    if (query.categories?.length) {
      qb.andWhere('vsc_report.category IN (:...categories)', { categories: query.categories });
    }
    if (query.dateFrom) {
      qb.andWhere('vsc_report.createdAt >= :dateFrom', { dateFrom: parseLocalDate(query.dateFrom) });
    }
    if (query.dateTo) {
      qb.andWhere('vsc_report.createdAt <= :dateTo', { dateTo: parseLocalDateEndOfDay(query.dateTo) });
    }
    if (query.userId) {
      qb.andWhere('(vsc_report.volunteerId = :userId OR vsc_report.vscId = :userId)', { userId: query.userId });
    }
    if (query.sessionId) {
      qb.andWhere('vsc_report.sessionId = :sessionId', { sessionId: query.sessionId });
    }
    if (query.establishmentId) {
      qb.andWhere('vsc_report.establishmentId = :establishmentId', { establishmentId: query.establishmentId });
    }
    if (query.search) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = vsc_report.volunteerId
          AND (
            u.first_name ILIKE :search
            OR u.last_name ILIKE :search
            OR CONCAT(u.first_name, ' ', u.last_name) ILIKE :search
            OR u.email ILIKE :search
          )
        )`,
        { search: `%${query.search}%` }
      );
    }
    
    // Role-based filtering
    if (this.hasRole(roleCodes, 'VOLUNTEER', 'VSC') && userId) {
      qb.andWhere(
        '(vsc_report.volunteerId = :userId OR vsc_report.vscId = :userId)',
        { userId }
      );
    }
    
    qb.orderBy('vsc_report.createdAt', 'DESC')
      .skip(skip)
      .take(take);
    
    const [data, total] = await qb.getManyAndCount();
    return createPaginatedResponse(data, total, page, pageSize);
  }

  async findVscReports(
    sessionId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<VscReport[]> {
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    return this.vscReportRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  async createVscReport(
    sessionId: string,
    companyId: string,
    dto: CreateVscReportDto,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<VscReport> {
    await this.findOneSession(sessionId, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    const entity = this.vscReportRepository.create({ ...dto, sessionId, companyId });
    const saved = await this.vscReportRepository.save(entity);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'vsc_reports',
      entityId: saved.id,
      action: 'CREATE',
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async findOneVscReport(
    sessionId: string,
    reportId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<VscReport> {
    if (sessionId) {
      await this.findOneSession(sessionId, companyId);
      if (userId && roleCodes) {
        await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
      }
    }
    
    const r = await this.vscReportRepository.findOne({ 
      where: sessionId 
        ? { id: reportId, sessionId, companyId }
        : { id: reportId, companyId },
      relations: ['session', 'student', 'volunteer', 'vsc', 'establishment'],
    });
    
    if (!r) throw new NotFoundException(`VSC report ${reportId} not found`);

    // Vérifier l'accès pour les volunteers (rapports automatiques)
    const isVolunteer = this.hasRole(roleCodes, 'VOLUNTEER', 'VSC');
    if (isVolunteer && userId) {
      const hasAccess = r.volunteerId === userId || r.vscId === userId;
      if (!hasAccess) {
        throw new ForbiddenException('Vous ne pouvez consulter que vos propres rapports');
      }
    }
    
    return r;
  }

  async updateVscReport(
    sessionId: string,
    reportId: string,
    companyId: string,
    dto: UpdateVscReportDto,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
    writeScope?: VisibilityScope | null,
  ): Promise<VscReport> {
    if (userId && roleCodes && writeScope !== undefined) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes, writeScope);
    }
    const r = await this.findOneVscReport(sessionId, reportId, companyId, userId, roleCodes);
    
    // Vérifier que l'utilisateur peut modifier ce rapport
    const isVolunteer = this.hasRole(roleCodes, 'VOLUNTEER', 'VSC');
    const isAdmin = this.hasRole(roleCodes, 'ADMIN', 'COORDINATOR', 'MANAGER');
    
    if (isVolunteer && !isAdmin && userId) {
      const canModify = r.volunteerId === userId || r.vscId === userId;
      if (!canModify) {
        throw new ForbiddenException('Vous ne pouvez modifier que vos propres rapports');
      }
    }
    
    const oldValue = { ...r } as unknown as Record<string, unknown>;
    Object.assign(r, dto);
    const saved = await this.vscReportRepository.save(r);
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'vsc_reports',
      entityId: reportId,
      action: 'UPDATE',
      oldValue,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return saved;
  }
  async removeVscReport(
    sessionId: string,
    reportId: string,
    companyId: string,
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
    writeScope?: VisibilityScope | null,
  ): Promise<void> {
    if (userId && roleCodes && writeScope !== undefined) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes, writeScope);
    }
    const r = await this.findOneVscReport(sessionId, reportId, companyId, userId, roleCodes);
    
    // Vérifier que l'utilisateur peut supprimer ce rapport
    const isVolunteer = this.hasRole(roleCodes, 'VOLUNTEER', 'VSC');
    const isAdmin = this.hasRole(roleCodes, 'ADMIN', 'COORDINATOR', 'MANAGER');
    
    if (isVolunteer && !isAdmin && userId) {
      const canDelete = r.volunteerId === userId || r.vscId === userId;
      if (!canDelete) {
        throw new ForbiddenException('Vous ne pouvez supprimer que vos propres rapports');
      }
    }
    
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'vsc_reports',
      entityId: reportId,
      action: 'DELETE',
      oldValue: { id: r.id } as Record<string, unknown>,
    });
    await this.vscReportRepository.delete(reportId);
  }

  // --- Assignment (student–tutor pairs) ---

  /**
   * Get all student-tutor pairs across all sessions for the matching interface.
   * Returns pairs with full relations (session, student user, tutor user).
   */
  async getAllStudentTutorPairs(
    companyId: string,
    query: any,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
    actionScopes?: Map<string, VisibilityScope | null>,
  ): Promise<PaginatedResponse<SessionStudentTutorPair>> {
    const { page = 1, pageSize = 20, types, sessionId, tutorId, studentId, establishmentId, subjectId, dateFrom, dateTo, tutorSearch, studentSearch } = query;
    const { skip, take } = getSkipTake(page, pageSize);

    // Build query with all necessary relations
    const qb = this.studentTutorPairRepository
      .createQueryBuilder('pair')
      .leftJoinAndSelect('pair.session', 'session')
      .leftJoinAndSelect('session.establishment', 'establishment')
      .leftJoinAndSelect('session.room', 'room')
      .leftJoinAndSelect('pair.studentUser', 'studentUser')
      .leftJoinAndSelect('studentUser.userProfiles', 'studentProfiles')
      .leftJoinAndSelect('pair.tutorUser', 'tutorUser')
      .leftJoinAndSelect('tutorUser.userProfiles', 'tutorProfiles')
      .where('session.company_id = :companyId', { companyId })
      .orderBy('session.sessionDate', 'DESC')
      .addOrderBy('session.startTime', 'DESC');

    // Apply filters
    if (types && types.length > 0) {
      qb.andWhere('pair.assignment_source IN (:...types)', { types });
    }

    if (sessionId) {
      qb.andWhere('pair.session_id = :sessionId', { sessionId });
    }

    if (tutorId) {
      qb.andWhere('pair.tutor_user_id = :tutorId', { tutorId });
    }

    if (studentId) {
      qb.andWhere('pair.student_user_id = :studentId', { studentId });
    }

    if (establishmentId) {
      qb.andWhere('session.establishment_id = :establishmentId', { establishmentId });
    }

    if (subjectId) {
      qb.andWhere('session.subject_ids @> :pairSubjectIdArr::jsonb', {
        pairSubjectIdArr: JSON.stringify([subjectId]),
      });
    }

    if (dateFrom) {
      qb.andWhere('session.session_date >= :dateFrom', { dateFrom: parseLocalDate(dateFrom) });
    }

    if (dateTo) {
      qb.andWhere('session.session_date <= :dateTo', { dateTo: parseLocalDateEndOfDay(dateTo) });
    }

    if (tutorSearch && tutorSearch.trim().length > 0) {
      qb.andWhere(
        '(LOWER(tutorUser.first_name) LIKE LOWER(:tutorSearch) OR LOWER(tutorUser.last_name) LIKE LOWER(:tutorSearch))',
        { tutorSearch: `%${tutorSearch}%` }
      );
    }

    if (studentSearch && studentSearch.trim().length > 0) {
      qb.andWhere(
        '(LOWER(studentUser.first_name) LIKE LOWER(:studentSearch) OR LOWER(studentUser.last_name) LIKE LOWER(:studentSearch))',
        { studentSearch: `%${studentSearch}%` }
      );
    }

    // Apply visibility scope via the centralized resolver.
    if (visibilityScope !== undefined && visibilityScope !== null) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'pairs',
        { userId: userId ?? '', companyId },
      );
    }

    qb.skip(skip).take(take);

    const [pairs, total] = await qb.getManyAndCount();

    // Enrich each pair with statistics
    const enrichedPairs = await Promise.all(
      pairs.map(async (pair) => {
        if (pair.session) this.applySessionSubjectLabelCompat(pair.session);
        // Count total sessions for this student-tutor pair
        const sessionCount = await this.studentTutorPairRepository
          .createQueryBuilder('p')
          .leftJoin('p.session', 's')
          .where('p.student_user_id = :studentId', { studentId: pair.studentUserId })
          .andWhere('p.tutor_user_id = :tutorId', { tutorId: pair.tutorUserId })
          .andWhere('s.company_id = :companyId', { companyId })
          .getCount();

        // Get last session (most recent past session)
        const lastSessionPair = await this.studentTutorPairRepository
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.session', 's')
          .where('p.student_user_id = :studentId', { studentId: pair.studentUserId })
          .andWhere('p.tutor_user_id = :tutorId', { tutorId: pair.tutorUserId })
          .andWhere('s.company_id = :companyId', { companyId })
          .andWhere('s.session_date < :now', { now: new Date() })
          .orderBy('s.sessionDate', 'DESC')
          .addOrderBy('s.startTime', 'DESC')
          .getOne();

        // Get next session (nearest future session)
        const nextSessionPair = await this.studentTutorPairRepository
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.session', 's')
          .where('p.student_user_id = :studentId', { studentId: pair.studentUserId })
          .andWhere('p.tutor_user_id = :tutorId', { tutorId: pair.tutorUserId })
          .andWhere('s.company_id = :companyId', { companyId })
          .andWhere('s.session_date >= :now', { now: new Date() })
          .orderBy('s.sessionDate', 'ASC')
          .addOrderBy('s.startTime', 'ASC')
          .getOne();

        return {
          ...pair,
          sessionCount,
          lastSession: lastSessionPair?.session
            ? {
                sessionDate: lastSessionPair.session.sessionDate,
                startTime: lastSessionPair.session.startTime,
                endTime: lastSessionPair.session.endTime,
              }
            : undefined,
          nextSession: nextSessionPair?.session
            ? {
                sessionDate: nextSessionPair.session.sessionDate,
                startTime: nextSessionPair.session.startTime,
                endTime: nextSessionPair.session.endTime,
              }
            : undefined,
        };
      }),
    );

    // Calcul des _permissions si actionScopes fourni
    if (actionScopes && actionScopes.size > 0) {
      const allPairIds = pairs.map((p) => p.id);
      for (const [action, scope] of actionScopes.entries()) {
        if (!scope) continue;
        const allowedIds = await this.visibilityScopeResolver.resolveEntityIds(
          allPairIds,
          'id',
          scope,
          'pairs',
          { userId: userId!, companyId },
        );
        for (const pair of enrichedPairs) {
          if (!(pair as any)._permissions) {
            (pair as any)._permissions = {};
          }
          (pair as any)._permissions[action] = allowedIds.has(pair.id);
        }
      }
    }

    return createPaginatedResponse(enrichedPairs, total, page, pageSize);
  }

  async getStudentTutorPair(
    companyId: string,
    pairId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionStudentTutorPair & { 
    sessionCount: number; 
    lastSession?: { sessionDate: Date; startTime: string; endTime: string }; 
    nextSession?: { sessionDate: Date; startTime: string; endTime: string }; 
  }> {
    // Build query with all necessary relations
    const qb = this.studentTutorPairRepository
      .createQueryBuilder('pair')
      .leftJoinAndSelect('pair.session', 'session')
      .leftJoinAndSelect('session.establishment', 'establishment')
      .leftJoinAndSelect('session.room', 'room')
      .leftJoinAndSelect('pair.studentUser', 'studentUser')
      .leftJoinAndSelect('studentUser.userProfiles', 'studentProfiles')
      .leftJoinAndSelect('pair.tutorUser', 'tutorUser')
      .leftJoinAndSelect('tutorUser.userProfiles', 'tutorProfiles')
      .where('pair.id = :pairId', { pairId })
      .andWhere('session.company_id = :companyId', { companyId });

    // If user has restricted access, filter by their establishments
    if (userId && roleCodes) {
      const hasFullAccess = roleCodes.some((c) =>
        ['ADMIN', 'COORDINATOR', 'MANAGER'].includes(c.toUpperCase()),
      );

      if (!hasFullAccess) {
        // Get user's establishments
        const userEstablishments = await this.usersService.getUserEstablishments(companyId, userId);
        const establishmentIds = userEstablishments.map((e) => e.id);

        if (establishmentIds.length === 0) {
          throw new Error('No access to any establishments');
        }

        qb.andWhere('session.establishment_id IN (:...establishmentIds)', { establishmentIds });
      }
    }

    const pair = await qb.getOne();

    if (!pair) {
      throw new Error('Student-tutor pair not found or access denied');
    }

    if (pair.session) this.applySessionSubjectLabelCompat(pair.session);

    // Enrich with statistics
    // Count total sessions for this student-tutor pair
    const sessionCount = await this.studentTutorPairRepository
      .createQueryBuilder('p')
      .leftJoin('p.session', 's')
      .where('p.student_user_id = :studentId', { studentId: pair.studentUserId })
      .andWhere('p.tutor_user_id = :tutorId', { tutorId: pair.tutorUserId })
      .andWhere('s.company_id = :companyId', { companyId })
      .getCount();

    // Get last session (most recent past session)
    const lastSessionPair = await this.studentTutorPairRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.session', 's')
      .where('p.student_user_id = :studentId', { studentId: pair.studentUserId })
      .andWhere('p.tutor_user_id = :tutorId', { tutorId: pair.tutorUserId })
      .andWhere('s.company_id = :companyId', { companyId })
      .andWhere('s.session_date < :now', { now: new Date() })
      .orderBy('s.sessionDate', 'DESC')
      .addOrderBy('s.startTime', 'DESC')
      .getOne();

    // Get next session (nearest future session)
    const nextSessionPair = await this.studentTutorPairRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.session', 's')
      .where('p.student_user_id = :studentId', { studentId: pair.studentUserId })
      .andWhere('p.tutor_user_id = :tutorId', { tutorId: pair.tutorUserId })
      .andWhere('s.company_id = :companyId', { companyId })
      .andWhere('s.session_date >= :now', { now: new Date() })
      .orderBy('s.sessionDate', 'ASC')
      .addOrderBy('s.startTime', 'ASC')
      .getOne();

    return {
      ...pair,
      sessionCount,
      lastSession: lastSessionPair?.session
        ? {
            sessionDate: lastSessionPair.session.sessionDate,
            startTime: lastSessionPair.session.startTime,
            endTime: lastSessionPair.session.endTime,
          }
        : undefined,
      nextSession: nextSessionPair?.session
        ? {
            sessionDate: nextSessionPair.session.sessionDate,
            startTime: nextSessionPair.session.startTime,
            endTime: nextSessionPair.session.endTime,
          }
        : undefined,
    };
  }

  /** Students and tutors of the same establishment, subject and availability for the session slot. */
  async getAssignmentCandidates(
    sessionId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<{ students: User[]; tutors: User[] }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, companyId },
      relations: ['activity'],
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    if (!session.establishmentId) throw new BadRequestException('Session has no establishment');
    const establishmentId = session.establishmentId;
    const subjectId = session.subjectIds?.[0] ?? null;
    const sessionDate = session.sessionDate;
    const startTime = String(session.startTime ?? '').trim();
    const endTime = String(session.endTime ?? '').trim();

    const [rawStudents, rawTutors] = await Promise.all([
      this.usersService.findUsersByEstablishmentAndRoleCodes(companyId, establishmentId, ['STUDENT']),
      this.usersService.findUsersByEstablishmentAndRoleCodes(companyId, establishmentId, ['TEACHER', 'VOLUNTEER']),
    ]);

    const dateForAvailability =
      sessionDate instanceof Date ? sessionDate : new Date(sessionDate + 'Z');

    const filterCandidate = (u: User) => {
      const profiles = u.userProfiles ?? [];
      const hasSubject = !subjectId || profiles.some((p) => profileHasSubject(p.subjects ?? undefined, subjectId));
      const available = !startTime || !endTime || profiles.some((p) => isAvailableForSession(p.availability ?? undefined, dateForAvailability, startTime, endTime));
      return hasSubject && available;
    };

    const students = rawStudents.filter(filterCandidate);
    const tutors = rawTutors.filter(filterCandidate);
    return { students, tutors };
  }

  /** Replace manual assignments for the session and sync session_participants. */
  async setAssignments(
    sessionId: string,
    companyId: string,
    pairs: { studentUserId: string; tutorUserId: string }[],
    participants?: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[],
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionStudentTutorPair[]> {
    const session = await this.findOneSession(sessionId, companyId);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    return this.replaceAssignmentsForSession(
      sessionId,
      companyId,
      pairs,
      participants,
      actorId,
      { sessionType: session.type },
    );
  }

  private async syncSessionParticipantsExplicit(
    sessionId: string,
    participants: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[],
  ): Promise<void> {
    // Get existing participants
    const existing = await this.participantRepository.find({ where: { sessionId } });
    const existingMap = new Map(existing.map((p) => [p.userId, p]));
    
    // Participants to keep (from the new list)
    const newUserIds = new Set(participants.map((p) => p.userId));
    
    // Remove participants not in the new list
    const toRemove = existing.filter((p) => !newUserIds.has(p.userId));
    if (toRemove.length > 0) {
      await this.participantRepository.remove(toRemove);
    }
    
    // Add or update participants
    for (const p of participants) {
      const existingParticipant = existingMap.get(p.userId);
      if (existingParticipant) {
        // Update role if changed
        if (existingParticipant.role !== p.role) {
          existingParticipant.role = p.role;
          await this.participantRepository.save(existingParticipant);
        }
      } else {
        // Create new participant
        const newParticipant = this.participantRepository.create({
          sessionId,
          userId: p.userId,
          role: p.role,
          attendanceStatus: 'absent',
        });
        await this.participantRepository.save(newParticipant);
      }
    }
  }

  private async syncSessionParticipantsFromPairs(
    sessionId: string,
    pairs: { studentUserId: string; tutorUserId: string }[],
  ): Promise<void> {
    const userIds = new Set<string>();
    pairs.forEach((p) => {
      userIds.add(p.studentUserId);
      userIds.add(p.tutorUserId);
    });
    const existing = await this.participantRepository.find({ where: { sessionId } });
    const existingUserIds = new Set(existing.map((e) => e.userId));
    for (const uid of userIds) {
      if (existingUserIds.has(uid)) continue;
      const role = pairs.some((p) => p.studentUserId === uid) ? 'student' : 'tutor';
      const participant = this.participantRepository.create({ sessionId, userId: uid, role });
      await this.participantRepository.save(participant);
    }
  }

  /** Run auto-assignment: keep manual pairs, fill remaining with binôme cœur, then history, then balanced. */
  async runAutoAssignment(
    sessionId: string,
    companyId: string,
    participants?: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[],
    actorId?: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<SessionStudentTutorPair[]> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, companyId },
      relations: ['activity'],
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    if (!session.establishmentId) throw new BadRequestException('Session has no establishment');

    const existingPairs = await this.studentTutorPairRepository.find({ where: { sessionId } });
    const manualStudentIds = new Set(
      existingPairs.filter((p) => p.assignmentSource === 'manual').map((p) => p.studentUserId),
    );
    
    // If participants are provided, use them; otherwise use candidates from DB
    let students: User[];
    let tutors: User[];
    
    if (participants && participants.length > 0) {
      // Use explicit participants list - fetch users by IDs
      const studentUserIds = participants.filter(p => p.role === 'student').map(p => p.userId);
      const tutorUserIds = participants.filter(p => p.role === 'tutor' || p.role === 'volunteer').map(p => p.userId);
      
      // Fetch users from DB using usersService
      const allUsers = await Promise.all([
        ...studentUserIds.map(id => this.usersService.findOne(id, companyId)),
        ...tutorUserIds.map(id => this.usersService.findOne(id, companyId)),
      ]);
      
      students = allUsers.slice(0, studentUserIds.length);
      tutors = allUsers.slice(studentUserIds.length);
    } else {
      // Use assignment candidates (all eligible users)
      const candidates = await this.getAssignmentCandidates(sessionId, companyId);
      students = candidates.students;
      tutors = candidates.tutors;
    }
    
    const unassignedStudents = students.filter((s) => !manualStudentIds.has(s.id));
    const tutorIdsSet = new Set(tutors.map((t) => t.id));
    const maxPerTutor = session.activity?.maxStudentsPerTutor ?? 10;
    const newPairs: { studentUserId: string; tutorUserId: string; source: AssignmentSource }[] = [];
    const establishmentId = session.establishmentId;
    const subjectId = session.subjectIds?.[0] ?? null;

    const getTutorCounts = () => {
      const m = new Map<string, number>();
      existingPairs.forEach((p) => m.set(p.tutorUserId, (m.get(p.tutorUserId) ?? 0) + 1));
      newPairs.forEach((p) => m.set(p.tutorUserId, (m.get(p.tutorUserId) ?? 0) + 1));
      return m;
    };

    for (const student of unassignedStudents) {
      const binomeRows = await this.binomeCoeurRepository
        .createQueryBuilder('bc')
        .select([
          'bc.id',
          'bc.companyId',
          'bc.establishmentId',
          'bc.subjectId',
          'bc.studentUserId',
          'bc.tutorUserId',
          'bc.source',
          'bc.createdAt',
        ])
        .where('bc.company_id = :companyId', { companyId })
        .andWhere('bc.establishment_id = :establishmentId', { establishmentId })
        .andWhere(
          subjectId == null ? 'bc.subject_id IS NULL' : 'bc.subject_id = :subjectId',
          subjectId == null ? {} : { subjectId },
        )
        .andWhere('bc.student_user_id = :studentUserId', { studentUserId: student.id })
        .getMany();
      const tutorCounts = getTutorCounts();
      let assigned = false;
      for (const row of binomeRows) {
        if (!tutorIdsSet.has(row.tutorUserId)) continue;
        const count = tutorCounts.get(row.tutorUserId) ?? 0;
        if (count < maxPerTutor) {
          newPairs.push({
            studentUserId: student.id,
            tutorUserId: row.tutorUserId,
            source: 'auto_binome_coeur',
          });
          assigned = true;
          break;
        }
      }
      if (assigned) continue;

      // Auto binôme: ≥5 common sessions (same establishment, subject)
      for (const t of tutors) {
        const count = tutorCounts.get(t.id) ?? 0;
        if (count >= maxPerTutor) continue;
        const common = await this.binomeCoeurService.countCommonSessions(
          student.id,
          t.id,
          establishmentId,
          subjectId,
        );
        if (common >= 5) {
          newPairs.push({
            studentUserId: student.id,
            tutorUserId: t.id,
            source: 'auto_binome_coeur',
          });
          assigned = true;
          break;
        }
      }
      if (assigned) continue;

      let chosenTutorId: string | null = null;
      let minCount = maxPerTutor + 1;
      for (const t of tutors) {
        const count = tutorCounts.get(t.id) ?? 0;
        if (count < maxPerTutor && count < minCount) {
          minCount = count;
          chosenTutorId = t.id;
        }
      }
      if (chosenTutorId) {
        newPairs.push({
          studentUserId: student.id,
          tutorUserId: chosenTutorId,
          source: 'auto_balanced',
        });
      }
    }

    const toSave = newPairs.map((p) =>
      this.studentTutorPairRepository.create({
        sessionId,
        sessionType: session.type,
        studentUserId: p.studentUserId,
        tutorUserId: p.tutorUserId,
        assignmentSource: p.source,
      }),
    );
    const saved = await this.studentTutorPairRepository.save(toSave);
    
    // If participants were provided, sync them explicitly; otherwise derive from pairs
    if (participants) {
      await this.syncSessionParticipantsExplicit(sessionId, participants);
    } else {
      await this.syncSessionParticipantsFromPairs(sessionId, [...existingPairs, ...saved]);
    }
    
    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'session_assignments',
      entityId: sessionId,
      action: 'UPDATE',
      newValue: { autoAssignments: saved.length } as unknown as Record<string, unknown>,
    });
    return [...existingPairs, ...saved];
  }

  /**
   * Propose auto-assignment pairs without persisting anything.
   *
   * Applies the same 3-level algorithm as runAutoAssignment (binôme cœur table,
   * ≥5 common sessions, balanced) but adjusts maxStudentsPerTutor and pairing
   * logic based on the session type:
   *
   *   individual_tutoring → maxPerTutor forced to 1 (strict 1:1)
   *   homework_help / workshop / group_tutoring → maxPerTutor from activity (default 10)
   *   whole_class → all eligible tutors paired with all eligible students (N:N cross-product)
   *
   * Nothing is written to the database. No audit log is created.
   */
  async proposeAutoAssignment(
    sessionId: string,
    companyId: string,
    participants?: { userId: string; role: 'student' | 'tutor' | 'volunteer' }[],
    userId?: string,
    roleCodes?: string[],
  ): Promise<AutoAssignmentProposalDto> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, companyId },
      relations: ['activity'],
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (userId && roleCodes) {
      await this.assertSessionAccess(sessionId, companyId, userId, roleCodes);
    }
    if (!session.establishmentId) throw new BadRequestException('Session has no establishment');

    const existingPairs = await this.studentTutorPairRepository.find({ where: { sessionId } });
    const manualStudentIds = new Set(
      existingPairs.filter((p) => p.assignmentSource === 'manual').map((p) => p.studentUserId),
    );

    let students: User[];
    let tutors: User[];

    if (participants && participants.length > 0) {
      const studentUserIds = participants.filter((p) => p.role === 'student').map((p) => p.userId);
      const tutorUserIds = participants
        .filter((p) => p.role === 'tutor' || p.role === 'volunteer')
        .map((p) => p.userId);
      const allUsers = await Promise.all([
        ...studentUserIds.map((id) => this.usersService.findOne(id, companyId)),
        ...tutorUserIds.map((id) => this.usersService.findOne(id, companyId)),
      ]);
      students = allUsers.slice(0, studentUserIds.length);
      tutors = allUsers.slice(studentUserIds.length);
    } else {
      const candidates = await this.getAssignmentCandidates(sessionId, companyId);
      students = candidates.students;
      tutors = candidates.tutors;
    }

    // individual_tutoring: force maxPerTutor = 1; otherwise use activity value (default 10)
    const maxPerTutor =
      session.type === 'individual_tutoring' ? 1 : (session.activity?.maxStudentsPerTutor ?? 10);

    return this.computeProposalForContext(
      companyId,
      {
        sessionType: session.type,
        establishmentId: session.establishmentId,
        subjectId: session.subjectIds?.[0] ?? null,
        maxPerTutor,
      },
      students,
      tutors,
      manualStudentIds,
    );
  }

  /**
   * Propose des binômes pour une séance qui n'existe PAS encore en base (mode "draft").
   * Le client fournit le contexte (type, établissement, sujet, activité, participants)
   * directement, et rien n'est persisté. Utilisé par le formulaire de création de séance.
   */
  async proposeAutoAssignmentDraft(
    companyId: string,
    dto: ProposeDraftAutoAssignmentDto,
  ): Promise<AutoAssignmentProposalDto> {
    if (!dto.participants?.length) {
      throw new BadRequestException('participants is required for draft auto-assignment proposal');
    }
    const studentUserIds = dto.participants
      .filter((p) => p.role === 'student')
      .map((p) => p.userId);
    const tutorUserIds = dto.participants
      .filter((p) => p.role === 'tutor' || p.role === 'volunteer')
      .map((p) => p.userId);

    if (tutorUserIds.length === 0) {
      throw new BadRequestException('At least one tutor or volunteer is required');
    }

    const allUsers = await Promise.all([
      ...studentUserIds.map((id) => this.usersService.findOne(id, companyId)),
      ...tutorUserIds.map((id) => this.usersService.findOne(id, companyId)),
    ]);
    const students = allUsers.slice(0, studentUserIds.length);
    const tutors = allUsers.slice(studentUserIds.length);

    // Déterminer maxStudentsPerTutor depuis l'activité si fournie.
    let maxFromActivity: number | undefined;
    if (dto.activityId) {
      const activity = await this.activityRepository.findOne({
        where: { id: dto.activityId, companyId },
      });
      maxFromActivity = activity?.maxStudentsPerTutor ?? undefined;
    }
    const maxPerTutor =
      dto.sessionType === 'individual_tutoring' ? 1 : (maxFromActivity ?? 10);

    return this.computeProposalForContext(
      companyId,
      {
        sessionType: dto.sessionType,
        establishmentId: dto.establishmentId,
        subjectId: dto.subjectId ?? null,
        maxPerTutor,
      },
      students,
      tutors,
      new Set(), // pas de pairs manuels existants en mode draft
    );
  }

  /**
   * Cœur de l'algorithme d'affectation auto, partagé entre `proposeAutoAssignment` (séance
   * persistée) et `proposeAutoAssignmentDraft` (séance pas encore en base).
   *
   * Pour chaque élève non encore matché manuellement :
   *  - Niveau 1 : recherche d'un binôme cœur explicite (table `binome_coeur`)
   *  - Niveau 2 : recherche d'un binôme cœur implicite (≥ 5 séances en commun)
   *  - Niveau 3 : équilibrage (tuteur le moins chargé)
   *
   * Cas particulier `whole_class` : produit cartésien (chaque élève × chaque tuteur).
   */
  private async computeProposalForContext(
    companyId: string,
    context: {
      sessionType: SessionType;
      establishmentId: string;
      subjectId: string | null;
      maxPerTutor: number;
    },
    students: User[],
    tutors: User[],
    manualStudentIds: Set<string>,
  ): Promise<AutoAssignmentProposalDto> {
    const { sessionType, establishmentId, subjectId, maxPerTutor } = context;
    const unassignedStudents = students.filter((s) => !manualStudentIds.has(s.id));

    const proposedPairs: ProposedPairDto[] = [];
    const unassignedStudentIds: string[] = [];

    // whole_class: cross-product — every student is paired with every eligible tutor
    if (sessionType === 'whole_class') {
      for (const student of unassignedStudents) {
        for (const tutor of tutors) {
          proposedPairs.push({ studentUserId: student.id, tutorUserId: tutor.id, source: 'auto_balanced' });
        }
        if (tutors.length === 0) {
          unassignedStudentIds.push(student.id);
        }
      }
      return { sessionType, proposedPairs, unassignedStudentIds };
    }

    const tutorIdsSet = new Set(tutors.map((t) => t.id));

    // Track proposed counts (for maxPerTutor enforcement)
    const getTutorCounts = () => {
      const m = new Map<string, number>();
      proposedPairs.forEach((p) => m.set(p.tutorUserId, (m.get(p.tutorUserId) ?? 0) + 1));
      return m;
    };

    for (const student of unassignedStudents) {
      // Level 1 — binôme cœur from the dedicated table
      const binomeRows = await this.binomeCoeurRepository
        .createQueryBuilder('bc')
        .select([
          'bc.id',
          'bc.companyId',
          'bc.establishmentId',
          'bc.subjectId',
          'bc.studentUserId',
          'bc.tutorUserId',
          'bc.source',
          'bc.createdAt',
        ])
        .where('bc.company_id = :companyId', { companyId })
        .andWhere('bc.establishment_id = :establishmentId', { establishmentId })
        .andWhere(
          subjectId == null ? 'bc.subject_id IS NULL' : 'bc.subject_id = :subjectId',
          subjectId == null ? {} : { subjectId },
        )
        .andWhere('bc.student_user_id = :studentUserId', { studentUserId: student.id })
        .getMany();

      const tutorCounts = getTutorCounts();
      let assigned = false;

      for (const row of binomeRows) {
        if (!tutorIdsSet.has(row.tutorUserId)) continue;
        const count = tutorCounts.get(row.tutorUserId) ?? 0;
        if (count < maxPerTutor) {
          proposedPairs.push({ studentUserId: student.id, tutorUserId: row.tutorUserId, source: 'auto_binome_coeur' });
          assigned = true;
          break;
        }
      }
      if (assigned) continue;

      // Level 2 — binôme cœur by history (≥5 common sessions)
      for (const t of tutors) {
        const count = getTutorCounts().get(t.id) ?? 0;
        if (count >= maxPerTutor) continue;
        const common = await this.binomeCoeurService.countCommonSessions(
          student.id,
          t.id,
          establishmentId,
          subjectId,
        );
        if (common >= 5) {
          proposedPairs.push({ studentUserId: student.id, tutorUserId: t.id, source: 'auto_binome_coeur' });
          assigned = true;
          break;
        }
      }
      if (assigned) continue;

      // Level 3 — balanced: pick tutor with fewest current assignments
      let chosenTutorId: string | null = null;
      let minCount = maxPerTutor + 1;
      const counts = getTutorCounts();
      for (const t of tutors) {
        const count = counts.get(t.id) ?? 0;
        if (count < maxPerTutor && count < minCount) {
          minCount = count;
          chosenTutorId = t.id;
        }
      }
      if (chosenTutorId) {
        proposedPairs.push({ studentUserId: student.id, tutorUserId: chosenTutorId, source: 'auto_balanced' });
      } else {
        unassignedStudentIds.push(student.id);
      }
    }

    return { sessionType, proposedPairs, unassignedStudentIds };
  }

  private async assertSessionReportSubjectIds(
    companyId: string,
    session: Session,
    subjectIds: string[] | undefined,
  ): Promise<void> {
    if (!subjectIds?.length) return;
    const sessionSids = session.subjectIds ?? [];
    for (const id of subjectIds) {
      if (sessionSids.length > 0 && !sessionSids.includes(id)) {
        throw new BadRequestException('Une ou plusieurs matières ne font pas partie de la séance');
      }
    }
    const rows: { id: string }[] = await this.sessionRepository.manager.query(
      `SELECT id FROM subjects WHERE company_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL`,
      [companyId, subjectIds],
    );
    if (rows.length !== subjectIds.length) {
      throw new BadRequestException('Matière invalide');
    }
  }

  private async getSubjectIdLabelMap(companyId: string, subjectIds: string[]): Promise<Map<string, string>> {
    if (!subjectIds.length) return new Map();
    const rows: { id: string; label: string }[] = await this.sessionRepository.manager.query(
      `SELECT id, label FROM subjects WHERE company_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL`,
      [companyId, subjectIds],
    );
    return new Map(rows.map((r) => [r.id, r.label]));
  }

  private async resolveLevelNames(levelIds: string[], companyId: string): Promise<string[]> {
    if (!levelIds.length) return [];
    const rows: Array<{ id: string; label: string }> = await this.sessionRepository.manager.query(
      `SELECT id, label FROM levels WHERE id = ANY($1) AND company_id = $2 AND deleted_at IS NULL`,
      [levelIds, companyId],
    );
    return levelIds.map(
      (id) => rows.find((r) => r.id === id)?.label ?? id,
    );
  }

  private async resolveSubjectNames(subjectIds: string[], companyId: string): Promise<string[]> {
    if (!subjectIds.length) return [];
    const rows: Array<{ id: string; label: string }> = await this.sessionRepository.manager.query(
      `SELECT id, label FROM subjects WHERE id = ANY($1) AND company_id = $2 AND deleted_at IS NULL`,
      [subjectIds, companyId],
    );
    return subjectIds.map(
      (id) => rows.find((r) => r.id === id)?.label ?? id,
    );
  }

  /**
   * Check whether a tutor (as a session participant) has a conflicting session at the given date/time slot.
   * Returns { available: true } if no conflict is found, or { available: false, conflictingSession: {...} } otherwise.
   * Read-only — does NOT modify any data.
   */
  async checkRoomCapacity(
    companyId: string,
    roomId: string,
    participantsToAdd: number,
    sessionDate: string,
    startTime: string,
    endTime: string,
    excludeSessionId?: string,
  ): Promise<{
    available: boolean;
    roomName: string;
    capacity: number | null;
    currentParticipants: number;
    participantsToAdd: number;
    totalIfAdded: number;
    remaining: number | null;
    message?: string;
  }> {
    const room = await this.roomRepository.findOne({ where: { id: roomId, companyId } });
    if (!room) {
      throw new NotFoundException(`Salle avec l'ID ${roomId} introuvable`);
    }

    const qb = this.participantRepository
      .createQueryBuilder('sp')
      .innerJoin('sp.session', 's')
      .select('COUNT(sp.id)', 'total')
      .where('s.company_id = :companyId', { companyId })
      .andWhere('s.room_id = :roomId', { roomId })
      .andWhere('s.session_date = :sessionDate', { sessionDate })
      .andWhere('s.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [SessionStatus.CANCELLED, SessionStatus.CLOSED],
      })
      .andWhere('s.start_time < :endTime', { endTime })
      .andWhere('s.end_time > :startTime', { startTime })
      .andWhere('s.deleted_at IS NULL');

    if (excludeSessionId) {
      qb.andWhere('s.id != :excludeSessionId', { excludeSessionId });
    }

    const result = await qb.getRawOne<{ total: string }>();
    const currentParticipants = parseInt(result?.total ?? '0', 10);
    const totalIfAdded = currentParticipants + participantsToAdd;
    const capacity = room.capacity ?? null;
    const remaining = capacity !== null ? capacity - totalIfAdded : null;

    if (capacity !== null && totalIfAdded > capacity) {
      return {
        available: false,
        roomName: room.label ?? room.name,
        capacity,
        currentParticipants,
        participantsToAdd,
        totalIfAdded,
        remaining,
        message: `La salle "${room.label ?? room.name}" ne peut pas accueillir ${participantsToAdd} participant(s) supplémentaire(s). Capacité maximale : ${capacity}, participants déjà présents sur ce créneau : ${currentParticipants}, total demandé : ${totalIfAdded}.`,
      };
    }

    return {
      available: true,
      roomName: room.label ?? room.name,
      capacity,
      currentParticipants,
      participantsToAdd,
      totalIfAdded,
      remaining,
    };
  }

  async checkTutorAvailability(
    companyId: string,
    tutorId: string,
    sessionDate: string,
    startTime: string,
    endTime: string,
    excludeSessionId?: string,
  ): Promise<{
    available: boolean;
    conflictingSession?: {
      id: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
    };
  }> {
    const qb = this.sessionRepository
      .createQueryBuilder('s')
      .innerJoin('session_participants', 'sp', 'sp.session_id = s.id')
      .select(['s.id', 's.session_date', 's.start_time', 's.end_time'])
      .where('s.company_id = :companyId', { companyId })
      .andWhere('sp.user_id = :tutorId', { tutorId })
      .andWhere("sp.role IN ('tutor', 'volunteer')")
      .andWhere('s.session_date = :sessionDate', { sessionDate })
      .andWhere('s.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [SessionStatus.CANCELLED, SessionStatus.CLOSED],
      })
      .andWhere('s.start_time < :endTime', { endTime })
      .andWhere('s.end_time > :startTime', { startTime });

    if (excludeSessionId) {
      qb.andWhere('s.id != :excludeSessionId', { excludeSessionId });
    }

    const conflict = await qb.getOne();

    if (!conflict) {
      return { available: true };
    }

    const dateStr =
      conflict.sessionDate instanceof Date
        ? conflict.sessionDate.toISOString().slice(0, 10)
        : String(conflict.sessionDate);

    return {
      available: false,
      conflictingSession: {
        id: conflict.id,
        sessionDate: dateStr,
        startTime: String(conflict.startTime ?? '').trim(),
        endTime: String(conflict.endTime ?? '').trim(),
      },
    };
  }
}
