import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, LessThanOrEqual, Not, SelectQueryBuilder } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DateTime } from 'luxon';
import { VscDailyReport } from './entities/vsc-daily-report.entity';
import { Session, SessionStatus } from './entities/session.entity';
import { Company } from '../companies/entities/company.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionalMailService } from '../mail/transactional-mail.service';
import { AuditLogService } from '../audit/audit.service';
import { parseLocalDate, toLocalDateString } from '../../common/utils/date-parser.utils';
import { formatExportDate } from '../../common/utils/format.utils';
import { buildXlsxBuffer } from '../../common/utils/excel-export.util';
import { compareSessionSchedule, computeVscDailyReportVisibleAtJsDate } from './session-report-job.utils';
import { ListVscDailyReportsQueryDto, UpdateVscDailyReportDto } from './dto/vsc-daily-report.dto';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import type { VisibilityScope } from '../../common/visibility/visibility-scope.types';

const ROLES_CAN_ACCESS_ALL_SESSIONS = ['ADMIN', 'MANAGER'];

const VSC_DAILY_STATUS_FR: Record<string, string> = {
  to_fill: 'À compléter',
  submitted: 'Soumis',
  validated: 'Validé',
};

function formatDailyExportStatus(status: string | null | undefined): string {
  if (status == null || status === '') return '';
  return VSC_DAILY_STATUS_FR[status] ?? String(status);
}

function cell(val: unknown): string | number {
  if (val == null) return '';
  if (typeof val === 'number') return val;
  return typeof val === 'string' ? val : String(val);
}

/** Max establishment ids per `IN (...)` to stay well under pg bind limits. */
const ESTABLISHMENT_ID_CHUNK = 200;
/** Bulk upsert batch size for `vsc_daily_reports`. */
const UPSERT_CHUNK = 500;

@Injectable()
export class VscDailyReportsService {
  private readonly logger = new Logger(VscDailyReportsService.name);

  constructor(
    @InjectRepository(VscDailyReport)
    private readonly vscDailyReportRepository: Repository<VscDailyReport>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly transactionalMail: TransactionalMailService,
    private readonly auditLogService: AuditLogService,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
  ) {}

  private async getCompanyTimezone(companyId: string): Promise<string> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      select: ['timezone'],
    });
    return company?.timezone?.trim() || 'Europe/Paris';
  }

  private hasRole(roleCodes: string[] | undefined, ...expected: string[]): boolean {
    if (!roleCodes?.length) return false;
    const upper = new Set(roleCodes.map((code) => (code ?? '').toUpperCase()));
    return expected.some((role) => upper.has(role.toUpperCase()));
  }

  private canAccessAllSessions(roleCodes?: string[]): boolean {
    if (!roleCodes?.length) return false;
    const upper = new Set(roleCodes.map((c) => (c ?? '').toUpperCase()));
    return ROLES_CAN_ACCESS_ALL_SESSIONS.some((r) => upper.has(r));
  }

  private async getUserScopedEstablishmentIds(
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<string[] | null> {
    if (!userId || this.canAccessAllSessions(roleCodes)) return null;
    if (!this.hasRole(roleCodes, 'COORDINATOR', 'COORDINATEUR', 'CORDINATEUR', 'VOLUNTEER', 'VSC')) {
      return null;
    }
    const ests = await this.usersService.getUserEstablishments(companyId, userId);
    return ests.map((e) => e.id).filter(Boolean);
  }

  /**
   * 22h job: for each active company, create tomorrow's rows when ≥1 non-cancelled session exists;
   * visible_at from first session of the day (by start time).
   *
   * Optimised: per company we run O(1) queries for sessions and volunteers (chunked over
   * establishment ids), then a bulk upsert. Avoids N+1 per establishment that would breach
   * the 10s `statement_timeout`.
   */
  async generateTomorrowReportsForAllCompanies(): Promise<void> {
    const companies = await this.companyRepository.find({
      where: { status: 'active' },
      select: ['id'],
    });

    for (const company of companies) {
      try {
        await this.generateTomorrowReportsForCompany(company.id);
      } catch (e) {
        this.logger.error(
          `generateTomorrowReports: company=${company.id} ${(e as Error).message}`,
        );
      }
    }
  }

  private async generateTomorrowReportsForCompany(companyId: string): Promise<void> {
    const startedAt = Date.now();

    const tz = await this.getCompanyTimezone(companyId);
    const tomorrow = DateTime.now().setZone(tz).plus({ days: 1 }).toISODate();
    if (!tomorrow) return;

    const establishments = await this.establishmentRepository.find({
      where: { companyId, status: 'active' },
      select: ['id', 'companyId', 'timezone', 'name'],
    });
    if (establishments.length === 0) return;

    const estIds = establishments.map((e) => e.id);
    const sessionDate = parseLocalDate(tomorrow);

    const allSessions: Session[] = [];
    for (let i = 0; i < estIds.length; i += ESTABLISHMENT_ID_CHUNK) {
      const chunk = estIds.slice(i, i + ESTABLISHMENT_ID_CHUNK);
      const batch = await this.sessionRepository.find({
        where: {
          companyId,
          establishmentId: In(chunk),
          sessionDate,
          status: Not(SessionStatus.CANCELLED),
        },
      });
      allSessions.push(...batch);
    }

    const firstByEstId = new Map<string, Session>();
    for (const s of allSessions) {
      if (!s.establishmentId) continue;
      const existing = firstByEstId.get(s.establishmentId);
      if (!existing || compareSessionSchedule(s, existing) < 0) {
        firstByEstId.set(s.establishmentId, s);
      }
    }

    if (firstByEstId.size === 0) {
      this.logger.log(
        `vsc-daily company=${companyId} reportDay=${tomorrow} establishments=${establishments.length} sessions=0 — skip`,
      );
      return;
    }

    const targetEstIds = Array.from(firstByEstId.keys());
    const volunteerByEstId = await this.loadVolunteersByEstablishments(companyId, targetEstIds);

    const estById = new Map(establishments.map((e) => [e.id, e] as const));
    const genTime = new Date();
    const rows: QueryDeepPartialEntity<VscDailyReport>[] = [];
    let establishmentsWithoutVolunteer = 0;

    for (const estId of targetEstIds) {
      const establishment = estById.get(estId);
      const first = firstByEstId.get(estId);
      if (!establishment || !first) continue;

      const userIds = volunteerByEstId.get(estId) ?? [];
      if (userIds.length === 0) {
        establishmentsWithoutVolunteer++;
        this.logger.warn(
          `vsc-daily skip establishment=${estId} reportDay=${tomorrow}: no VOLUNTEER/VSC user in user_establishments`,
        );
        continue;
      }

      const zone = establishment.timezone?.trim() || tz;
      const visibleAt = computeVscDailyReportVisibleAtJsDate(first, zone);

      for (const userId of userIds) {
        rows.push({
          companyId,
          establishmentId: estId,
          reportDate: tomorrow,
          vscUserId: userId,
          visibleAt,
          unlockSessionId: first.id,
          status: 'to_fill',
          generatedAt: genTime,
          rating: null,
          comment: null,
          submittedAt: null,
          validatedBy: null,
          validatedAt: null,
          availabilityNotifiedAt: null,
        });
      }
    }

    let upserted = 0;
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK);
      try {
        await this.vscDailyReportRepository.upsert(chunk, {
          conflictPaths: ['companyId', 'establishmentId', 'reportDate', 'vscUserId'],
          skipUpdateIfNoValuesChanged: false,
        });
        upserted += chunk.length;
      } catch (err) {
        this.logger.warn(
          `vsc-daily upsert chunk failed (${chunk.length} rows): ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `vsc-daily company=${companyId} reportDay=${tomorrow} establishments=${establishments.length} withSessions=${firstByEstId.size} noVolunteer=${establishmentsWithoutVolunteer} rows=${rows.length} upserted=${upserted} elapsedMs=${Date.now() - startedAt}`,
    );
  }

  /**
   * Returns `Map<establishment_id, user_id[]>` for users linked to the establishment with role
   * VOLUNTEER or VSC (same pairing as session VSC permissions elsewhere in the app).
   * Single SQL per chunk — replaces the per-establishment query that did 2 round-trips each.
   */
  private async loadVolunteersByEstablishments(
    companyId: string,
    establishmentIds: string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (establishmentIds.length === 0) return result;

    for (let i = 0; i < establishmentIds.length; i += ESTABLISHMENT_ID_CHUNK) {
      const chunk = establishmentIds.slice(i, i + ESTABLISHMENT_ID_CHUNK);
      const rows = await this.sessionRepository.manager
        .createQueryBuilder()
        .select('ue.user_id', 'user_id')
        .addSelect('ue.establishment_id', 'establishment_id')
        .from('user_establishments', 'ue')
        .innerJoin('user_roles', 'ur', 'ur.user_id = ue.user_id')
        .innerJoin(
          'roles',
          'r',
          'r.id = ur.role_id AND r.company_id = :companyId AND r.deleted_at IS NULL',
        )
        .innerJoin('users', 'u', 'u.id = ue.user_id AND u.deleted_at IS NULL')
        .where('ue.company_id = :companyId', { companyId })
        .andWhere('ue.establishment_id IN (:...estIds)', { estIds: chunk })
        .andWhere('UPPER(r.code) IN (:...vscDailyRoleCodes)', {
          vscDailyRoleCodes: ['VOLUNTEER', 'VSC'],
        })
        .getRawMany<{ user_id: string; establishment_id: string }>();

      const seen = new Set<string>();
      for (const row of rows) {
        const key = `${row.establishment_id}|${row.user_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const list = result.get(row.establishment_id) ?? [];
        list.push(row.user_id);
        result.set(row.establishment_id, list);
      }
    }

    return result;
  }

  /**
   * Called when a session is created (or moved) to today's calendar date.
   *
   * - INSERT a VSC daily report for every VSC user of the establishment that doesn't have one yet.
   * - On conflict, only update `visible_at` and `unlock_session_id` — never overwrites
   *   status / rating / comment already set by the VSC.
   *
   * The correct `visible_at` is always recomputed from the full set of non-cancelled sessions
   * for that establishment and date, so the result is idempotent regardless of call order.
   */
  async reconcileOnSameDaySessionCreate(session: Session): Promise<void> {
    if (!session.establishmentId) return;

    const companyId = session.companyId;
    const tz = await this.getCompanyTimezone(companyId);
    const today = DateTime.now().setZone(tz).toISODate();
    if (!today) return;

    const reportDateStr = toLocalDateString(session.sessionDate);
    if (reportDateStr !== today) return;

    const sessions = await this.sessionRepository.find({
      where: {
        companyId,
        establishmentId: session.establishmentId,
        sessionDate: parseLocalDate(reportDateStr),
        status: Not(SessionStatus.CANCELLED),
      },
    });
    if (sessions.length === 0) return;

    const first = sessions.slice().sort((a, b) => compareSessionSchedule(a, b))[0];

    const est = await this.establishmentRepository.findOne({
      where: { id: session.establishmentId },
    });
    const zone = est?.timezone?.trim() || tz;
    const visibleAt = computeVscDailyReportVisibleAtJsDate(first, zone);

    const volunteerByEstId = await this.loadVolunteersByEstablishments(companyId, [
      session.establishmentId,
    ]);
    const userIds = volunteerByEstId.get(session.establishmentId) ?? [];
    if (userIds.length === 0) return;

    const genTime = new Date();
    const rows: QueryDeepPartialEntity<VscDailyReport>[] = userIds.map((userId) => ({
      companyId,
      establishmentId: session.establishmentId!,
      reportDate: reportDateStr,
      vscUserId: userId,
      visibleAt,
      unlockSessionId: first.id,
      status: 'to_fill' as const,
      generatedAt: genTime,
      rating: null,
      comment: null,
      submittedAt: null,
      validatedBy: null,
      validatedAt: null,
      availabilityNotifiedAt: null,
    }));

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK);
      try {
        await this.vscDailyReportRepository
          .createQueryBuilder()
          .insert()
          .into(VscDailyReport)
          .values(chunk)
          .orUpdate(
            ['visible_at', 'unlock_session_id'],
            ['company_id', 'establishment_id', 'report_date', 'vsc_user_id'],
          )
          .execute();
      } catch (err) {
        this.logger.warn(
          `vsc-daily same-day upsert chunk failed (${chunk.length} rows): ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `vsc-daily same-day company=${companyId} estab=${session.establishmentId} date=${reportDateStr} rows=${rows.length}`,
    );
  }

  /**
   * After session cancel or schedule-affecting change: same rule as generation (≥1 non-cancelled).
   */
  async reconcileAfterSessionChange(session: Session): Promise<void> {
    if (!session.establishmentId) return;
    const reportDateStr = toLocalDateString(session.sessionDate);
    const companyId = session.companyId;

    const remaining = await this.sessionRepository.count({
      where: {
        companyId,
        establishmentId: session.establishmentId,
        sessionDate: parseLocalDate(reportDateStr),
        status: Not(SessionStatus.CANCELLED),
      },
    });

    if (remaining === 0) {
      await this.vscDailyReportRepository.delete({
        companyId,
        establishmentId: session.establishmentId,
        reportDate: reportDateStr,
      });
      return;
    }

    const sessions = await this.sessionRepository.find({
      where: {
        companyId,
        establishmentId: session.establishmentId,
        sessionDate: parseLocalDate(reportDateStr),
        status: Not(SessionStatus.CANCELLED),
      },
    });
    const first = sessions.slice().sort((a, b) => compareSessionSchedule(a, b))[0];
    const est = await this.establishmentRepository.findOne({
      where: { id: session.establishmentId },
    });
    const companyTz = await this.getCompanyTimezone(companyId);
    const zone = est?.timezone?.trim() || companyTz;
    const visibleAt = computeVscDailyReportVisibleAtJsDate(first, zone);

    await this.vscDailyReportRepository.update(
      { companyId, establishmentId: session.establishmentId, reportDate: reportDateStr },
      { visibleAt, unlockSessionId: first.id },
    );
  }

  /**
   * Push in-app notifications once visible_at has passed (real-time channel when client is connected).
   * When a new notification row is created, also sends the transactional SendGrid email (if enabled).
   */
  async dispatchAvailabilityNotifications(): Promise<void> {
    const now = new Date();
    const pending = await this.vscDailyReportRepository.find({
      where: {
        visibleAt: LessThanOrEqual(now),
        availabilityNotifiedAt: IsNull(),
      },
      take: 200,
      relations: ['establishment'],
      order: { visibleAt: 'ASC' },
    });

    for (const row of pending) {
      const establishmentName =
        row.establishment?.name?.trim() || '';
      const dayKey =
        typeof row.reportDate === 'string'
          ? row.reportDate.slice(0, 10)
          : toLocalDateString(row.reportDate as unknown as Date);

      try {
        const created = await this.notificationsService.createIfNotDuplicate({
          companyId: row.companyId,
          userId: row.vscUserId,
          type: 'VSC_DAILY_REPORT_AVAILABLE',
          title: 'Rapport VSC journalier disponible',
          body: establishmentName
            ? `Votre rapport VSC pour « ${establishmentName} » (${dayKey}) est disponible. Merci de le compléter.`
            : `Votre rapport VSC du ${dayKey} est disponible. Merci de le compléter.`,
          payload: {
            establishmentId: row.establishmentId,
            vscDailyReportId: row.id,
            reportDate: dayKey,
          },
          dedupeKey: `vsc-daily-report:${row.id}`,
        });
        row.availabilityNotifiedAt = new Date();
        await this.vscDailyReportRepository.save(row);
        if (!created) {
          this.logger.debug(`vsc-daily notify duplicate skipped for report=${row.id}`);
        } else {
          const recipient = await this.userRepository.findOne({
            where: { id: row.vscUserId, companyId: row.companyId },
            select: ['email'],
          });
          const email = recipient?.email?.trim();
          if (email) {
            await this.transactionalMail
              .sendVscDailyReportAvailable({
                companyId: row.companyId,
                establishmentId: row.establishmentId,
                recipientEmail: email,
                dayKeyIso: dayKey,
              })
              .catch((err) =>
                this.logger.warn(
                  `VSC daily report mail failed report=${row.id}: ${(err as Error).message}`,
                ),
              );
          }
        }
      } catch (e) {
        this.logger.warn(`dispatchAvailabilityNotifications ${row.id}: ${(e as Error).message}`);
      }
    }
  }

  /**
   * Shared list/export query: same filters and access rules as {@link list}.
   * Returns null when the user has no accessible establishments (empty scope).
   */
  private async buildDailyListQuery(
    companyId: string,
    query: ListVscDailyReportsQueryDto,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<SelectQueryBuilder<VscDailyReport> | null> {
    const qb = this.vscDailyReportRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.establishment', 'establishment')
      .leftJoinAndSelect('r.vscUser', 'vscUser')
      .leftJoinAndSelect('r.unlockSession', 'unlockSession')
      .where('r.company_id = :companyId', { companyId });

    if (visibilityScope) {
      await this.visibilityScopeResolver.applyToQueryBuilder(
        qb,
        visibilityScope,
        'vscDailyReports',
        { userId: userId!, companyId },
      );
    } else {
      // legacy fallback — conserver jusqu'à migration complète des controllers
      const scoped = await this.getUserScopedEstablishmentIds(companyId, userId, roleCodes);
      if (scoped) {
        if (scoped.length === 0) {
          return null;
        }
        qb.andWhere('r.establishment_id IN (:...scoped)', { scoped });
      }
    }

    const isVolunteerOnly =
      this.hasRole(roleCodes, 'VOLUNTEER', 'VSC') &&
      !this.hasRole(roleCodes, 'ADMIN', 'MANAGER', 'COORDINATOR', 'COORDINATEUR', 'COORDINATEUR', 'TUTOR', 'TEACHER');

    if (isVolunteerOnly && userId) {
      qb.andWhere('r.vsc_user_id = :userId', { userId });
    }

    if (!query.includeNotYetVisible) {
      qb.andWhere('r.visible_at <= :_dailyVisNow', { _dailyVisNow: new Date() });
    }

    if (query.establishmentId) {
      qb.andWhere('r.establishment_id = :eid', { eid: query.establishmentId });
    }
    if (query.reportDate) {
      qb.andWhere('r.report_date = :rd', { rd: query.reportDate });
    }
    if (query.reportDateFrom) {
      qb.andWhere('r.report_date >= :rdf', { rdf: query.reportDateFrom });
    }
    if (query.reportDateTo) {
      qb.andWhere('r.report_date <= :rdt', { rdt: query.reportDateTo });
    }
    if (query.statuses?.length) {
      qb.andWhere('r.status IN (:...st)', { st: query.statuses });
    } else if (query.status) {
      qb.andWhere('r.status = :st', { st: query.status });
    }

    if (query.search?.trim()) {
      const dailyVscSearch = `%${query.search.trim()}%`;
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = r.vsc_user_id
          AND (
            u.first_name ILIKE :dailyVscSearch
            OR u.last_name ILIKE :dailyVscSearch
            OR CONCAT(u.first_name, ' ', u.last_name) ILIKE :dailyVscSearch
            OR u.email ILIKE :dailyVscSearch
          )
        )`,
        { dailyVscSearch },
      );
    }

    return qb;
  }

  async list(
    companyId: string,
    query: ListVscDailyReportsQueryDto,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<{ data: VscDailyReport[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

    const qb = await this.buildDailyListQuery(companyId, query, userId, roleCodes, visibilityScope);
    if (!qb) {
      return { data: [], total: 0, page, pageSize };
    }

    qb.orderBy('r.reportDate', 'DESC').addOrderBy('r.createdAt', 'DESC');
    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { data, total, page, pageSize };
  }

  /**
   * Excel export for daily VSC reports; same filters and scoping as {@link list} (no pagination).
   */
  async exportDailyReportsExcel(
    companyId: string,
    query: ListVscDailyReportsQueryDto,
    userId?: string,
    roleCodes?: string[],
    visibilityScope?: VisibilityScope | null,
  ): Promise<Buffer> {
    const headerRow = [
      'ID',
      'Date rapport',
      'Statut',
      'Catégorie',
      'Établissement',
      'VSC',
      'Note',
      'Commentaire',
      'Date séance (déblocage)',
      'Disponible à partir de',
      'Soumis le',
      'Validé le',
    ];

    const empty = () => buildXlsxBuffer({ sheetName: 'Rapports VSC journaliers', headerRow, dataRows: [] });

    const qb = await this.buildDailyListQuery(companyId, query, userId, roleCodes, visibilityScope);
    if (!qb) {
      return empty();
    }

    qb.orderBy('r.reportDate', 'DESC').addOrderBy('r.createdAt', 'DESC');
    const reports = await qb.getMany();

    const vscName = (r: VscDailyReport): string => {
      const u = r.vscUser;
      if (!u) return '';
      const dn = u.displayName?.trim();
      if (dn) return dn;
      return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    };

    const dataRows = reports.map((r) => {
      const estName = r.establishment?.name?.trim() ?? '';
      const unlockDate = r.unlockSession?.sessionDate;
      return [
        cell(r.id),
        typeof r.reportDate === 'string' ? r.reportDate.slice(0, 10) : formatExportDate(r.reportDate as Date),
        formatDailyExportStatus(r.status),
        'Journalier',
        estName,
        vscName(r),
        cell(r.rating ?? ''),
        cell(r.comment ?? ''),
        unlockDate ? formatExportDate(unlockDate as Date) : '',
        formatExportDate(r.visibleAt),
        formatExportDate(r.submittedAt ?? undefined),
        formatExportDate(r.validatedAt ?? undefined),
      ];
    });

    return buildXlsxBuffer({
      sheetName: 'Rapports VSC journaliers',
      headerRow,
      dataRows,
    });
  }

  async findOne(
    reportId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<VscDailyReport> {
    const r = await this.vscDailyReportRepository.findOne({
      where: { id: reportId, companyId },
      relations: ['establishment', 'vscUser', 'unlockSession'],
    });
    if (!r) throw new NotFoundException('VSC daily report not found');

    const scoped = await this.getUserScopedEstablishmentIds(companyId, userId, roleCodes);
    if (scoped && !scoped.includes(r.establishmentId)) {
      throw new ForbiddenException('You do not have access to this report');
    }

    const isVolunteerOnly =
      this.hasRole(roleCodes, 'VOLUNTEER', 'VSC') &&
      !this.hasRole(roleCodes, 'ADMIN', 'MANAGER', 'COORDINATOR', 'COORDINATEUR', 'CORDINATEUR', 'TUTOR', 'TEACHER');

    if (isVolunteerOnly && userId && r.vscUserId !== userId) {
      throw new ForbiddenException('You can only access your own VSC daily report');
    }

    return r;
  }

  async updateReport(
    reportId: string,
    companyId: string,
    dto: UpdateVscDailyReportDto,
    userId?: string,
    roleCodes?: string[],
  ): Promise<VscDailyReport> {
    const r = await this.findOne(reportId, companyId, userId, roleCodes);

    if (r.status === 'validated') {
      throw new BadRequestException('Report is validated and cannot be edited');
    }

    /** Only the assigned VSC (volunteer/VSC account) may edit; coordinators/managers are read-only here. */
    if (!userId || r.vscUserId !== userId) {
      throw new ForbiddenException('Only the assigned VSC can edit this daily report');
    }
    if (!this.hasRole(roleCodes, 'VOLUNTEER', 'VSC')) {
      throw new ForbiddenException('Only volunteer or VSC accounts can edit a daily report');
    }
    if (new Date() < r.visibleAt) {
      throw new BadRequestException('Report is not yet available (before visible_at)');
    }

    if (dto.rating !== undefined) r.rating = dto.rating;
    if (dto.comment !== undefined) r.comment = dto.comment;
    if (dto.status === 'submitted') {
      if (r.rating == null) {
        throw new BadRequestException('Rating is required to submit');
      }
      r.status = 'submitted';
      r.submittedAt = new Date();
    }

    return this.vscDailyReportRepository.save(r);
  }

  async validateReport(
    reportId: string,
    companyId: string,
    userId?: string,
    roleCodes?: string[],
  ): Promise<VscDailyReport> {
    const canValidateDaily =
      this.hasRole(roleCodes, 'MANAGER', 'COORDINATOR', 'COORDINATEUR', 'CORDINATEUR') ||
      this.hasRole(roleCodes, 'manager', 'coordinator');
    if (!canValidateDaily) {
      throw new ForbiddenException('Only manager or coordinator can validate a daily VSC report');
    }

    const r = await this.findOne(reportId, companyId, userId, roleCodes);

    if (r.status !== 'submitted') {
      throw new BadRequestException('Only submitted reports can be validated');
    }

    const scoped = await this.getUserScopedEstablishmentIds(companyId, userId, roleCodes);
    if (scoped && !scoped.includes(r.establishmentId)) {
      throw new ForbiddenException('You do not have access to validate this report');
    }

    const oldValue = { ...r } as unknown as Record<string, unknown>;
    r.status = 'validated';
    r.validatedBy = userId ?? null;
    r.validatedAt = new Date();
    const saved = await this.vscDailyReportRepository.save(r);

    await this.auditLogService.log({
      companyId,
      userId,
      entity: 'vsc_daily_reports',
      entityId: reportId,
      action: 'UPDATE',
      oldValue,
      newValue: { status: 'validated', validatedBy: userId } as unknown as Record<string, unknown>,
    });

    return saved;
  }

  /**
   * Delete a VSC daily report. Elevated roles (admin, manager, coordinator) may delete any
   * report in scope; VSC/volunteer may delete only their own row (same idea as session VSC delete).
   */
  async removeReport(
    reportId: string,
    companyId: string,
    userId: string | undefined,
    roleCodes: string[] | undefined,
  ): Promise<void> {
    const r = await this.findOne(reportId, companyId, userId, roleCodes);

    const isVolunteerOrVsc =
      this.hasRole(roleCodes, 'VOLUNTEER', 'VSC') &&
      !this.hasRole(roleCodes, 'ADMIN', 'MANAGER', 'COORDINATOR', 'COORDINATEUR', 'COORDINATEUR', 'TUTOR', 'TEACHER');

    const isElevated =
      this.hasRole(roleCodes, 'ADMIN', 'MANAGER', 'COORDINATOR', 'COORDINATEUR', 'COORDINATEUR') ||
      this.hasRole(roleCodes, 'admin', 'manager');

    if (isVolunteerOrVsc) {
      if (!userId || r.vscUserId !== userId) {
        throw new ForbiddenException('You can only delete your own VSC daily report');
      }
    } else if (!isElevated) {
      throw new ForbiddenException('Insufficient permissions to delete this report');
    }

    await this.auditLogService.log({
      companyId,
      userId,
      entity: 'vsc_daily_reports',
      entityId: reportId,
      action: 'DELETE',
      oldValue: { id: r.id } as unknown as Record<string, unknown>,
    });

    await this.vscDailyReportRepository.delete(reportId);
  }
}
