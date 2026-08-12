import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Session, SessionStatus } from '../sessions/entities/session.entity';
import { SessionReport } from '../sessions/entities/session-report.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { VscReport } from '../sessions/entities/vsc-report.entity';
import { User } from '../users/entities/user.entity';
import { Establishment } from '../companies/entities/establishment.entity';
import { getEffectiveStatus } from '../sessions/session-status.transitions';
import { DashboardStatsQueryDto } from './dto/dashboard-stats-query.dto';
import { DashboardStatsResponseDto, DashboardStatDto, DashboardComparisonStatDto } from './dto/dashboard-stats-response.dto';
import { parseLocalDate, parseLocalDateEndOfDay } from '../../common/utils/date-parser.utils';
import { VisibilityScopeResolverService } from '../../common/visibility/visibility-scope-resolver.service';
import { RoleBindingRules, VisibilityScope } from '../../common/visibility/visibility-scope.types';

// ─── Scope Filter ────────────────────────────────────────────────────────────

type SessionScopeFilter =
  | { kind: 'unrestricted' }
  | { kind: 'establishment_ids'; ids: string[] }
  | { kind: 'session_ids'; ids: string[] }
  | { kind: 'managed_by'; userId: string }
  | { kind: 'empty' };

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionReport)
    private readonly sessionReportRepository: Repository<SessionReport>,
    @InjectRepository(SessionParticipant)
    private readonly participantRepository: Repository<SessionParticipant>,
    @InjectRepository(VscReport)
    private readonly vscReportRepository: Repository<VscReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
    private readonly visibilityScopeResolver: VisibilityScopeResolverService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC — getDashboardStats
  // ═══════════════════════════════════════════════════════════════

  async getDashboardStats(
    companyId: string,
    query: DashboardStatsQueryDto,
    userId?: string,
    visibilityScope?: VisibilityScope | null,
  ): Promise<DashboardStatsResponseDto> {
    let effectiveScope: VisibilityScope | null | undefined = visibilityScope;
    if (
      effectiveScope &&
      'rules' in effectiveScope &&
      Array.isArray((effectiveScope as unknown as RoleBindingRules).rules)
    ) {
      effectiveScope = this.visibilityScopeResolver.compileRulesToScope(
        effectiveScope as unknown as RoleBindingRules,
      );
    }
    const scopeFilter = await this.resolveSessionScopeFilter(effectiveScope, userId ?? '', companyId);

    if (query.compare) {
      return this.getDashboardStatsWithComparison(companyId, query, scopeFilter);
    }

    const dateFilter = this.buildDateFilter(query);
    const previousPeriodFilter = this.buildPreviousPeriodFilter(query);

    const [
      sessionsStats,
      reportsStats,
      studentsStats,
      tutorsStats,
      establishmentsStats,
      vscReportsStats,
      newKpisStats,
    ] = await Promise.all([
      this.calculateSessionsStats(companyId, dateFilter, previousPeriodFilter, query, scopeFilter),
      this.calculateReportsStats(companyId, dateFilter, previousPeriodFilter, query, scopeFilter),
      this.calculateStudentsStats(companyId, dateFilter, previousPeriodFilter, query, scopeFilter),
      this.calculateTutorsStats(companyId, dateFilter, query, scopeFilter),
      this.calculateEstablishmentsStats(companyId, query, scopeFilter),
      this.calculateVscReportsStats(companyId, dateFilter, query, scopeFilter),
      this.calculateNewKpis(companyId, query, scopeFilter),
    ]);

    const stats: Record<string, DashboardStatDto> = {
      ...sessionsStats,
      ...reportsStats,
      ...studentsStats,
      ...tutorsStats,
      ...establishmentsStats,
      ...vscReportsStats,
      ...newKpisStats,
    };

    return {
      stats,
      calculatedAt: new Date().toISOString(),
      period: {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        schoolYearId: query.schoolYearId,
      },
    };
  }

  private async getDashboardStatsWithComparison(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<DashboardStatsResponseDto> {
    const { current, previous, comparisonLabel } = this.buildComparisonPeriods(query.compare!);

    const currentQuery: DashboardStatsQueryDto = { ...query, dateFrom: current.dateFrom, dateTo: current.dateTo };
    const previousQuery: DashboardStatsQueryDto = { ...query, dateFrom: previous.dateFrom, dateTo: previous.dateTo };

    const currentDateFilter = this.buildDateFilter(currentQuery);
    const previousDateFilter = this.buildDateFilter(previousQuery);

    const [
      currentSessionsStats,
      currentReportsStats,
      currentStudentsStats,
      currentTutorsStats,
      currentEstablishmentsStats,
      currentVscReportsStats,
      currentNewKpisStats,
      previousSessionsStats,
      previousReportsStats,
      previousStudentsStats,
      previousTutorsStats,
      previousEstablishmentsStats,
      previousVscReportsStats,
      previousNewKpisStats,
    ] = await Promise.all([
      this.calculateSessionsStats(companyId, currentDateFilter, undefined, currentQuery, scopeFilter),
      this.calculateReportsStats(companyId, currentDateFilter, undefined, currentQuery, scopeFilter),
      this.calculateStudentsStats(companyId, currentDateFilter, undefined, currentQuery, scopeFilter),
      this.calculateTutorsStats(companyId, currentDateFilter, currentQuery, scopeFilter),
      this.calculateEstablishmentsStats(companyId, currentQuery, scopeFilter),
      this.calculateVscReportsStats(companyId, currentDateFilter, currentQuery, scopeFilter),
      this.calculateNewKpis(companyId, currentQuery, scopeFilter),
      this.calculateSessionsStats(companyId, previousDateFilter, undefined, previousQuery, scopeFilter),
      this.calculateReportsStats(companyId, previousDateFilter, undefined, previousQuery, scopeFilter),
      this.calculateStudentsStats(companyId, previousDateFilter, undefined, previousQuery, scopeFilter),
      this.calculateTutorsStats(companyId, previousDateFilter, previousQuery, scopeFilter),
      this.calculateEstablishmentsStats(companyId, previousQuery, scopeFilter),
      this.calculateVscReportsStats(companyId, previousDateFilter, previousQuery, scopeFilter),
      this.calculateNewKpis(companyId, previousQuery, scopeFilter),
    ]);

    const currentStats: Record<string, DashboardStatDto> = {
      ...currentSessionsStats,
      ...currentReportsStats,
      ...currentStudentsStats,
      ...currentTutorsStats,
      ...currentEstablishmentsStats,
      ...currentVscReportsStats,
      ...currentNewKpisStats,
    };

    const previousStats: Record<string, DashboardStatDto> = {
      ...previousSessionsStats,
      ...previousReportsStats,
      ...previousStudentsStats,
      ...previousTutorsStats,
      ...previousEstablishmentsStats,
      ...previousVscReportsStats,
      ...previousNewKpisStats,
    };

    return {
      stats: this.buildComparisonStats(currentStats, previousStats, comparisonLabel),
      calculatedAt: new Date().toISOString(),
      period: {
        dateFrom: current.dateFrom,
        dateTo: current.dateTo,
        schoolYearId: query.schoolYearId,
        compare: query.compare,
        previousDateFrom: previous.dateFrom,
        previousDateTo: previous.dateTo,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // VISIBILITY SCOPE HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Converts a VisibilityScope into a flat SessionScopeFilter by resolving
   * the user's establishment IDs or assigned session IDs from the DB.
   * Called once per request — result is reused by all KPI sub-queries.
   */
  private async resolveSessionScopeFilter(
    scope: VisibilityScope | null | undefined,
    userId: string,
    companyId: string,
  ): Promise<SessionScopeFilter> {
    if (!scope || scope.scope === 'unrestricted') return { kind: 'unrestricted' };

    if (scope.scope === 'same_establishment') {
      const ids = await this.visibilityScopeResolver.resolveEstablishmentIds(userId, companyId);
      return ids.length ? { kind: 'establishment_ids', ids } : { kind: 'empty' };
    }

    if (scope.scope === 'assignment') {
      const ids = await this.visibilityScopeResolver.resolveAssignedSessionIds(userId, companyId);
      return ids.length ? { kind: 'session_ids', ids } : { kind: 'empty' };
    }

    if (scope.scope === 'managed_by') {
      return userId ? { kind: 'managed_by', userId } : { kind: 'unrestricted' };
    }

    if (scope.scope === 'same_establishment_or_managed_by') {
      const ids = await this.visibilityScopeResolver.resolveEstablishmentIds(userId, companyId);
      return ids.length
        ? { kind: 'establishment_ids', ids }
        : userId
          ? { kind: 'managed_by', userId }
          : { kind: 'unrestricted' };
    }

    const fallbackIds = await this.visibilityScopeResolver.resolveEstablishmentIds(userId, companyId);
    return fallbackIds.length ? { kind: 'establishment_ids', ids: fallbackIds } : { kind: 'unrestricted' };
  }

  /**
   * Appends a scope SQL fragment to the params array and returns the fragment string.
   * Mutates params so that $N indices remain correct.
   *
   * @param alias  SQL alias of the `sessions` table in the query (default: 's')
   */
  private appendScopeToSql(
    params: any[],
    filter: SessionScopeFilter,
    alias = 's',
  ): string {
    if (filter.kind === 'empty') return ' AND 1 = 0';
    if (filter.kind === 'establishment_ids') {
      params.push(filter.ids);
      return ` AND ${alias}.establishment_id = ANY($${params.length})`;
    }
    if (filter.kind === 'session_ids') {
      params.push(filter.ids);
      return ` AND ${alias}.id = ANY($${params.length})`;
    }
    if (filter.kind === 'managed_by') {
      params.push(filter.userId);
      return ` AND ${alias}.managed_by = $${params.length}`;
    }
    return ''; // unrestricted
  }

  /**
   * Appends visibility scope SQL for raw queries against `users` (alias default `u`).
   * establishment_ids → filter via user_establishments; session_ids → via session_participants.
   */
  private appendUserScopeToSql(
    params: any[],
    filter: SessionScopeFilter,
    userAlias = 'u',
  ): string {
    if (filter.kind === 'empty') return ' AND 1 = 0';
    if (filter.kind === 'establishment_ids') {
      params.push(filter.ids);
      return ` AND EXISTS (
        SELECT 1 FROM user_establishments ue_vs
        WHERE ue_vs.user_id = ${userAlias}.id AND ue_vs.establishment_id = ANY($${params.length})
      )`;
    }
    if (filter.kind === 'session_ids') {
      params.push(filter.ids);
      return ` AND EXISTS (
        SELECT 1 FROM session_participants sp_vs
        WHERE sp_vs.user_id = ${userAlias}.id AND sp_vs.session_id = ANY($${params.length})
      )`;
    }
    if (filter.kind === 'managed_by') {
      params.push(filter.userId);
      return ` AND EXISTS (
        SELECT 1 FROM session_participants sp_mgd
        INNER JOIN sessions s_mgd ON s_mgd.id = sp_mgd.session_id
        WHERE sp_mgd.user_id = ${userAlias}.id
          AND sp_mgd.role = 'student'
          AND s_mgd.managed_by = $${params.length}
      )`;
    }
    return ''; // unrestricted
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPARISON HELPERS
  // ═══════════════════════════════════════════════════════════════

  private formatDateToString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private buildComparisonPeriods(compare: 'week' | 'month' | 'trim' | 'year'): {
    current: { dateFrom: string; dateTo: string };
    previous: { dateFrom: string; dateTo: string };
    comparisonLabel: string;
  } {
    const now = new Date();

    if (compare === 'week') {
      const dayOfWeek = now.getDay(); // 0 = Sun
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const currentSunday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + 6);
      const previousMonday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 7);
      const previousSunday = new Date(previousMonday.getFullYear(), previousMonday.getMonth(), previousMonday.getDate() + 6);
      return {
        current: { dateFrom: this.formatDateToString(currentMonday), dateTo: this.formatDateToString(currentSunday) },
        previous: { dateFrom: this.formatDateToString(previousMonday), dateTo: this.formatDateToString(previousSunday) },
        comparisonLabel: 'semaine précédente',
      };
    }

    if (compare === 'month') {
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        current: { dateFrom: this.formatDateToString(currentMonthStart), dateTo: this.formatDateToString(currentMonthEnd) },
        previous: { dateFrom: this.formatDateToString(previousMonthStart), dateTo: this.formatDateToString(previousMonthEnd) },
        comparisonLabel: 'mois précédent',
      };
    }

    if (compare === 'trim') {
      // Current trimester: 3 full calendar months ending with the current month
      const currentTrimEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const currentTrimStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      // Previous trimester: the 3 months immediately before
      const previousTrimEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0);
      const previousTrimStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return {
        current: { dateFrom: this.formatDateToString(currentTrimStart), dateTo: this.formatDateToString(currentTrimEnd) },
        previous: { dateFrom: this.formatDateToString(previousTrimStart), dateTo: this.formatDateToString(previousTrimEnd) },
        comparisonLabel: 'trimestre précédent',
      };
    }

    // year
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const currentYearEnd = new Date(now.getFullYear(), 11, 31);
    const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear() - 1, 11, 31);
    return {
      current: { dateFrom: this.formatDateToString(currentYearStart), dateTo: this.formatDateToString(currentYearEnd) },
      previous: { dateFrom: this.formatDateToString(previousYearStart), dateTo: this.formatDateToString(previousYearEnd) },
      comparisonLabel: 'année précédente',
    };
  }

  private extractNumericValue(val: string | number): number {
    if (typeof val === 'number') return val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }

  private buildComparisonStats(
    currentStats: Record<string, DashboardStatDto>,
    previousStats: Record<string, DashboardStatDto>,
    comparisonLabel: string,
  ): Record<string, DashboardComparisonStatDto> {
    const result: Record<string, DashboardComparisonStatDto> = {};
    for (const key of Object.keys(currentStats)) {
      const curr = this.extractNumericValue(currentStats[key].value);
      const prev = this.extractNumericValue(previousStats[key]?.value ?? 0);
      const diff = curr - prev;
      const pct = prev !== 0 ? Math.round((diff / prev) * 100 * 10) / 10 : 0;
      result[key] = {
        id: key,
        currentValue: curr,
        previousValue: prev,
        differenceValue: Math.round(diff * 10) / 10,
        differencePercentage: pct,
        comparisonLabel,
      };
    }
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // DATE / FILTER HELPERS
  // ═══════════════════════════════════════════════════════════════

  private buildDateFilter(query: DashboardStatsQueryDto): any {
    if (query.dateFrom && query.dateTo) {
      return Between(parseLocalDate(query.dateFrom), parseLocalDateEndOfDay(query.dateTo));
    } else if (query.dateFrom) {
      return MoreThanOrEqual(parseLocalDate(query.dateFrom));
    } else if (query.dateTo) {
      return LessThanOrEqual(parseLocalDateEndOfDay(query.dateTo));
    }
    return undefined;
  }

  private buildPreviousPeriodFilter(query: DashboardStatsQueryDto): any {
    if (!query.dateFrom || !query.dateTo) return undefined;
    const start = parseLocalDate(query.dateFrom);
    const end = parseLocalDateEndOfDay(query.dateTo);
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime() - 1);
    return Between(prevStart, prevEnd);
  }


  private getEstablishmentIds(query: DashboardStatsQueryDto): string[] | undefined {
    if (query.establishmentIds?.length) return query.establishmentIds;
    if (query.establishmentId) return [query.establishmentId];
    return undefined;
  }

  // ═══════════════════════════════════════════════════════════════
  // EXISTING KPIs — refactored with scopeFilter
  // ═══════════════════════════════════════════════════════════════

  private async calculateSessionsStats(
    companyId: string,
    dateFilter: any,
    previousPeriodFilter: any,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<Record<string, DashboardStatDto>> {
    const baseWhere: any = { companyId };
    if (query.schoolYearId) baseWhere.schoolYearId = query.schoolYearId;
    const establishmentIds = this.getEstablishmentIds(query);
    if (establishmentIds?.length) baseWhere.establishmentId = In(establishmentIds);

    // For TypeORM find/count we still use a scopeFilter establishment filter when applicable,
    // because these calls don't use raw SQL. Session_ids scope is applied below via subquery.
    const scopedWhere = this.applyFilterToTypeOrmWhere(baseWhere, scopeFilter);

    const whereWithDate = dateFilter ? { ...scopedWhere, sessionDate: dateFilter } : scopedWhere;
    const wherePrevious = previousPeriodFilter
      ? { ...scopedWhere, sessionDate: previousPeriodFilter }
      : undefined;

    const [
      totalSessions,
      previousTotal,
      sessionsByStatus,
      currentMonthSessions,
      previousMonthSessions,
      totalHours,
      completedSessions,
      previousCompleted,
    ] = await Promise.all([
      this.sessionRepository.count({ where: whereWithDate }),
      wherePrevious ? this.sessionRepository.count({ where: wherePrevious }) : Promise.resolve(0),
      this.getSessionsByStatus(companyId, dateFilter, query, scopeFilter),
      this.getCurrentMonthSessions(companyId, query, scopeFilter),
      this.getPreviousMonthSessions(companyId, query, scopeFilter),
      this.calculateSessionHours(companyId, dateFilter, query, scopeFilter),
      this.calculateCompletedSessions(companyId, dateFilter, query, scopeFilter),
      wherePrevious
        ? this.calculateCompletedSessions(companyId, previousPeriodFilter, query, scopeFilter)
        : Promise.resolve(0),
    ]);

    const trend = previousTotal > 0 ? ((totalSessions - previousTotal) / previousTotal) * 100 : 0;
    const monthTrend =
      previousMonthSessions > 0
        ? ((currentMonthSessions - previousMonthSessions) / previousMonthSessions) * 100
        : 0;
    const completedTrend =
      previousCompleted > 0
        ? ((completedSessions - previousCompleted) / previousCompleted) * 100
        : 0;

    return {
      'stat-sessions-total': {
        id: 'stat-sessions-total',
        value: totalSessions,
        trend: previousTotal > 0
          ? { value: Math.round(Math.abs(trend) * 10) / 10, isPositive: trend >= 0 }
          : undefined,
      },
      'stat-sessions-by-status': {
        id: 'stat-sessions-by-status',
        value: `${sessionsByStatus.planned}P / ${sessionsByStatus.completed}T / ${sessionsByStatus.cancelled}A`,
        description: `${sessionsByStatus.planned} planifiées, ${sessionsByStatus.completed} terminées, ${sessionsByStatus.cancelled} annulées`,
      },
      'stat-sessions-month': {
        id: 'stat-sessions-month',
        value: currentMonthSessions,
        trend: previousMonthSessions > 0
          ? { value: Math.round(Math.abs(monthTrend) * 10) / 10, isPositive: monthTrend >= 0 }
          : undefined,
      },
      'stat-sessions-hours': {
        id: 'stat-sessions-hours',
        value: totalHours,
        description: 'Heures de séances',
      },
      'stat-sessions-completed': {
        id: 'stat-sessions-completed',
        value: completedSessions,
        trend: previousCompleted > 0
          ? { value: Math.round(Math.abs(completedTrend) * 10) / 10, isPositive: completedTrend >= 0 }
          : undefined,
      },
    };
  }

  /**
   * Applies a SessionScopeFilter to a TypeORM `where` object (for find/count calls).
   * For session_ids scope, falls back to an IN filter on `id`.
   */
  private applyFilterToTypeOrmWhere(baseWhere: any, scopeFilter: SessionScopeFilter): any {
    if (scopeFilter.kind === 'empty') return { ...baseWhere, id: In([]) };
    if (scopeFilter.kind === 'establishment_ids') {
      return { ...baseWhere, establishmentId: In(scopeFilter.ids) };
    }
    if (scopeFilter.kind === 'session_ids') {
      return { ...baseWhere, id: In(scopeFilter.ids) };
    }
    if (scopeFilter.kind === 'managed_by') {
      return { ...baseWhere, managedById: scopeFilter.userId };
    }
    return baseWhere;
  }

  private async getSessionsByStatus(
    companyId: string,
    dateFilter: any,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<{ planned: number; inProgress: number; completed: number; cancelled: number }> {
    const baseWhere: any = { companyId };
    if (query.schoolYearId) baseWhere.schoolYearId = query.schoolYearId;
    const establishmentIds = this.getEstablishmentIds(query);
    if (establishmentIds?.length) baseWhere.establishmentId = In(establishmentIds);
    if (dateFilter) baseWhere.sessionDate = dateFilter;

    const scopedWhere = this.applyFilterToTypeOrmWhere(baseWhere, scopeFilter);

    const sessions = await this.sessionRepository.find({
      where: scopedWhere,
      select: ['id', 'status', 'sessionDate', 'startTime', 'endTime'],
    });

    let planned = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;

    for (const session of sessions) {
      const effectiveStatus = getEffectiveStatus(session);
      switch (effectiveStatus) {
        case SessionStatus.PLANNED:
          planned++;
          break;
        case SessionStatus.IN_PROGRESS:
          inProgress++;
          break;
        case SessionStatus.COMPLETED:
        case SessionStatus.CLOSED:
          completed++;
          break;
        case SessionStatus.CANCELLED:
          cancelled++;
          break;
      }
    }

    return { planned, inProgress, completed, cancelled };
  }

  private async getCurrentMonthSessions(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const where: any = { companyId, sessionDate: Between(monthStart, monthEnd) };
    if (query.schoolYearId) where.schoolYearId = query.schoolYearId;
    const establishmentIds = this.getEstablishmentIds(query);
    if (establishmentIds?.length) where.establishmentId = In(establishmentIds);
    return this.sessionRepository.count({ where: this.applyFilterToTypeOrmWhere(where, scopeFilter) });
  }

  private async getPreviousMonthSessions(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<number> {
    const now = new Date();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const where: any = { companyId, sessionDate: Between(prevMonthStart, prevMonthEnd) };
    if (query.schoolYearId) where.schoolYearId = query.schoolYearId;
    const establishmentIds = this.getEstablishmentIds(query);
    if (establishmentIds?.length) where.establishmentId = In(establishmentIds);
    return this.sessionRepository.count({ where: this.applyFilterToTypeOrmWhere(where, scopeFilter) });
  }

  /**
   * Sum scheduled hours for effectively completed or closed sessions (stat-sessions-hours).
   * COMPLETED is never stored in DB — use getEffectiveStatus() at read time.
   */
  private async calculateSessionHours(
    companyId: string,
    dateFilter: any,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<string> {
    const baseWhere: any = {
      companyId,
      status: In([SessionStatus.PLANNED, SessionStatus.IN_PROGRESS, SessionStatus.CLOSED]),
    };
    if (query.schoolYearId) baseWhere.schoolYearId = query.schoolYearId;
    const establishmentIds = this.getEstablishmentIds(query);
    if (establishmentIds?.length) baseWhere.establishmentId = In(establishmentIds);
    if (dateFilter) baseWhere.sessionDate = dateFilter;

    const scopedWhere = this.applyFilterToTypeOrmWhere(baseWhere, scopeFilter);
    const sessions = await this.sessionRepository.find({
      where: scopedWhere,
      select: ['status', 'sessionDate', 'startTime', 'endTime'],
    });

    let totalMinutes = 0;
    for (const session of sessions) {
      const effectiveStatus = getEffectiveStatus(session);
      if (effectiveStatus !== SessionStatus.COMPLETED && effectiveStatus !== SessionStatus.CLOSED) {
        continue;
      }
      if (session.startTime && session.endTime) {
        const [startH, startM] = session.startTime.split(':').map(Number);
        const [endH, endM] = session.endTime.split(':').map(Number);
        const minutes = endH * 60 + endM - (startH * 60 + startM);
        if (minutes > 0) totalMinutes += minutes;
      }
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }

  /**
   * Calculates completed sessions using getEffectiveStatus (same logic as sessions API).
   * Counts sessions where computed status is COMPLETED or CLOSED.
   */
  private async calculateCompletedSessions(
    companyId: string,
    dateFilter: any,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<number> {
    const baseWhere: any = { companyId };
    if (query.schoolYearId) baseWhere.schoolYearId = query.schoolYearId;
    const establishmentIds = this.getEstablishmentIds(query);
    if (establishmentIds?.length) baseWhere.establishmentId = In(establishmentIds);
    if (dateFilter) baseWhere.sessionDate = dateFilter;

    const scopedWhere = this.applyFilterToTypeOrmWhere(baseWhere, scopeFilter);
    const sessions = await this.sessionRepository.find({
      where: scopedWhere,
      select: ['id', 'status', 'sessionDate', 'startTime', 'endTime'],
    });

    let completedCount = 0;
    for (const session of sessions) {
      const effectiveStatus = getEffectiveStatus(session);
      if (effectiveStatus === SessionStatus.COMPLETED || effectiveStatus === SessionStatus.CLOSED) {
        completedCount++;
      }
    }
    return completedCount;
  }

  private async calculateReportsStats(
    companyId: string,
    dateFilter: any,
    previousPeriodFilter: any,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<Record<string, DashboardStatDto>> {
    const establishmentIds = this.getEstablishmentIds(query);

    // "Comptes rendus en attente" = all session_reports with status 'to_complete',
    // filtered by date/schoolYear/establishment/scope via their parent session.
    const pendingParams: any[] = [companyId];
    let pendingIdx = 2;
    let pendingWhere = `
      WHERE sr.company_id = $1
        AND sr.status = 'to_complete'
        AND s.deleted_at IS NULL
        AND (
          ((s.session_date::text || ' ' || trim(both from s.start_time::text))::timestamp
           AT TIME ZONE COALESCE(c.timezone, 'Europe/Paris'))
          <= NOW()
        )
    `;
    if (query.dateFrom) {
      pendingWhere += ` AND s.session_date >= $${pendingIdx}`;
      pendingParams.push(query.dateFrom);
      pendingIdx++;
    }
    if (query.dateTo) {
      pendingWhere += ` AND s.session_date <= $${pendingIdx}`;
      pendingParams.push(query.dateTo);
      pendingIdx++;
    }
    if (query.schoolYearId) {
      pendingWhere += ` AND s.school_year_id = $${pendingIdx}`;
      pendingParams.push(query.schoolYearId);
      pendingIdx++;
    }
    if (establishmentIds?.length) {
      pendingWhere += ` AND s.establishment_id = ANY($${pendingIdx})`;
      pendingParams.push(establishmentIds);
      pendingIdx++;
    }
    pendingWhere += this.appendScopeToSql(pendingParams, scopeFilter, 's');

    const pendingResult = await this.sessionReportRepository.manager.query(
      `SELECT COUNT(*) as count
       FROM session_reports sr
       INNER JOIN sessions s ON s.id = sr.session_id
       INNER JOIN companies c ON c.id = sr.company_id
       ${pendingWhere}`,
      pendingParams,
    );
    const pendingReportsCount = Number(pendingResult[0]?.count || 0);

    // Taux de complétion : même périmètre que GET /sessions/reports (createdAt + séance déjà commencée,
    // timezone entreprise). school_year_id / establishment_id viennent de `sessions`.
    const completionParams: any[] = [companyId];
    const completionConditions: string[] = [
      'sr.company_id = $1',
      's.deleted_at IS NULL',
      `(
        ((s.session_date::text || ' ' || trim(both from s.start_time::text))::timestamp
         AT TIME ZONE COALESCE(c.timezone, 'Europe/Paris'))
        <= NOW()
      )`,
    ];
    if (query.dateFrom) {
      completionParams.push(parseLocalDate(query.dateFrom));
      completionConditions.push(`sr.created_at >= $${completionParams.length}`);
    }
    if (query.dateTo) {
      completionParams.push(parseLocalDateEndOfDay(query.dateTo));
      completionConditions.push(`sr.created_at <= $${completionParams.length}`);
    }
    if (query.schoolYearId) {
      completionParams.push(query.schoolYearId);
      completionConditions.push(`s.school_year_id = $${completionParams.length}`);
    }
    if (establishmentIds?.length) {
      completionParams.push(establishmentIds);
      completionConditions.push(`s.establishment_id = ANY($${completionParams.length})`);
    }
    const completionScopeSql = this.appendScopeToSql(completionParams, scopeFilter, 's');
    const completionFrom = `
      FROM session_reports sr
      INNER JOIN sessions s ON s.id = sr.session_id
      INNER JOIN companies c ON c.id = sr.company_id
      WHERE ${completionConditions.join(' AND ')}${completionScopeSql}
    `;

    const totalReportsResult = await this.sessionReportRepository.manager.query(
      `SELECT COUNT(*)::int as count ${completionFrom}`,
      completionParams,
    );
    const totalReports = Number(totalReportsResult[0]?.count || 0);

    const submittedValidatedResult = await this.sessionReportRepository.manager.query(
      `SELECT COUNT(*)::int as count ${completionFrom} AND sr.status IN ('submitted', 'validated')`,
      completionParams,
    );
    const submittedAndValidated = Number(submittedValidatedResult[0]?.count || 0);

    const completionRate = totalReports > 0 ? (submittedAndValidated / totalReports) * 100 : 0;

    const previousCompletedWhere: any = { companyId };
    if (previousPeriodFilter) previousCompletedWhere.sessionDate = previousPeriodFilter;
    if (establishmentIds?.length) {
      previousCompletedWhere.establishmentId = In(establishmentIds);
    }
    const scopedPrevWhere = this.applyFilterToTypeOrmWhere(previousCompletedWhere, scopeFilter);

    const previousCompleted = previousPeriodFilter
      ? await this.sessionRepository.count({
          where: [
            { ...scopedPrevWhere, status: SessionStatus.COMPLETED },
            { ...scopedPrevWhere, status: SessionStatus.CLOSED },
          ],
        })
      : 0;

    const previousReports =
      previousCompleted > 0 && previousPeriodFilter
        ? establishmentIds?.length
          ? await this.sessionReportRepository
              .createQueryBuilder('r')
              .innerJoin('r.session', 's')
              .where('r.companyId = :companyId', { companyId })
              .andWhere('r.status = :status', { status: 'validated' })
              .andWhere('s.establishmentId IN (:...establishmentIds)', { establishmentIds })
              .getCount()
          : await this.sessionReportRepository.count({ where: { companyId, status: 'validated' } })
        : 0;

    const previousCompletionRate = previousCompleted > 0 ? (previousReports / previousCompleted) * 100 : 0;
    const completionTrend = previousCompletionRate > 0 ? completionRate - previousCompletionRate : 0;

    return {
      'stat-reports-pending': {
        id: 'stat-reports-pending',
        value: pendingReportsCount,
        description: `${pendingReportsCount} comptes rendus à compléter`,
        trend: pendingReportsCount > 0 ? { value: pendingReportsCount, isPositive: false } : undefined,
      },
      'stat-reports-completion': {
        id: 'stat-reports-completion',
        value: `${Math.floor(completionRate)}%`,
        trend: previousCompletionRate > 0
          ? { value: Math.round(Math.abs(completionTrend) * 10) / 10, isPositive: completionTrend >= 0 }
          : undefined,
      },
    };
  }

  private async calculateStudentsStats(
    companyId: string,
    dateFilter: any,
    previousPeriodFilter: any,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<Record<string, DashboardStatDto>> {
    const establishmentIds = this.getEstablishmentIds(query);

    // ── stat-students-active ("Élèves actifs" / inscrits uniquement) ──
    // Élèves au statut compte Inscrit uniquement (`registered`) ; exclus accompagnés et désactivés.
    // Uses user_roles/roles instead of the empty profiles table.
    const activeStudentsParams: any[] = [companyId];
    let activeEstablishmentClause = '';
    if (establishmentIds?.length) {
      activeStudentsParams.push(establishmentIds);
      activeEstablishmentClause = ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${activeStudentsParams.length})
      )`;
    }
    activeEstablishmentClause += this.appendUserScopeToSql(activeStudentsParams, scopeFilter, 'u');
    const activeStudentsResult = await this.userRepository.manager.query(
      `SELECT COUNT(DISTINCT u.id) as count
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE u.company_id = $1
         AND r.code = 'student'
         AND u.status = 'registered'
         AND u.deleted_at IS NULL
         AND r.deleted_at IS NULL
         ${activeEstablishmentClause}`,
      activeStudentsParams,
    );
    const activeStudentsCount = Number(activeStudentsResult[0]?.count || 0);

    // ── stat-students-new ──────────────────────────────────────────
    const newStudentsParams: any[] = [companyId];
    let newStudentsIdx = 2;
    let newStudentsWhereExtra = '';
    if (establishmentIds?.length) {
      newStudentsWhereExtra += ` AND EXISTS (SELECT 1 FROM user_establishments ue WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${newStudentsIdx}))`;
      newStudentsParams.push(establishmentIds);
      newStudentsIdx++;
    }
    if (query.dateFrom) {
      newStudentsWhereExtra += ` AND u.created_at >= $${newStudentsIdx}`;
      newStudentsParams.push(query.dateFrom);
      newStudentsIdx++;
    }
    if (query.dateTo) {
      newStudentsWhereExtra += ` AND u.created_at <= $${newStudentsIdx}`;
      newStudentsParams.push(query.dateTo);
      newStudentsIdx++;
    }
    newStudentsWhereExtra += this.appendUserScopeToSql(newStudentsParams, scopeFilter, 'u');
    const newStudentsResult = await this.userRepository.manager.query(
      `SELECT COUNT(DISTINCT u.id) as count
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE u.company_id = $1
         AND r.code = 'student'
         AND u.deleted_at IS NULL
         AND r.deleted_at IS NULL
         ${newStudentsWhereExtra}`,
      newStudentsParams,
    );
    const newStudents = Number(newStudentsResult[0]?.count || 0);

    let previousNewStudents = 0;
    if (previousPeriodFilter && query.dateFrom && query.dateTo) {
      const start = new Date(query.dateFrom);
      const end = new Date(query.dateTo);
      const duration = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - duration);
      const prevEnd = new Date(start.getTime() - 1);

      const prevParams: any[] = [companyId];
      let prevIdx = 2;
      let prevExtra = '';
      if (establishmentIds?.length) {
        prevExtra += ` AND EXISTS (SELECT 1 FROM user_establishments ue WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${prevIdx}))`;
        prevParams.push(establishmentIds);
        prevIdx++;
      }
      prevExtra += ` AND u.created_at >= $${prevIdx}`;
      prevParams.push(prevStart.toISOString());
      prevIdx++;
      prevExtra += ` AND u.created_at <= $${prevIdx}`;
      prevParams.push(prevEnd.toISOString());

      prevExtra += this.appendUserScopeToSql(prevParams, scopeFilter, 'u');

      const prevResult = await this.userRepository.manager.query(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE u.company_id = $1
           AND r.code = 'student'
           AND u.deleted_at IS NULL
           AND r.deleted_at IS NULL
           ${prevExtra}`,
        prevParams,
      );
      previousNewStudents = Number(prevResult[0]?.count || 0);
    }

    const newStudentsTrend =
      previousNewStudents > 0
        ? ((newStudents - previousNewStudents) / previousNewStudents) * 100
        : 0;

    // ── stat-attendance-rate ───────────────────────────────────────
    const hasDateRange = !!(dateFilter && query.dateFrom && query.dateTo);
    const attendanceParams: any[] = [companyId];
    let attendanceIdx = 2;
    let attendanceQuery = `
      SELECT COUNT(*) as total, SUM(CASE WHEN sp.attendance_status = 'present' THEN 1 ELSE 0 END) as present
      FROM session_participants sp INNER JOIN sessions s ON s.id = sp.session_id
      WHERE s.company_id = $1 AND sp.role = 'student'
    `;
    if (hasDateRange) {
      attendanceQuery += ` AND s.session_date BETWEEN $${attendanceIdx} AND $${attendanceIdx + 1}`;
      attendanceParams.push(query.dateFrom, query.dateTo);
      attendanceIdx += 2;
    }
    if (query.schoolYearId) {
      attendanceQuery += ` AND s.school_year_id = $${attendanceIdx}`;
      attendanceParams.push(query.schoolYearId);
      attendanceIdx++;
    }
    if (establishmentIds?.length) {
      attendanceQuery += ` AND s.establishment_id = ANY($${attendanceIdx})`;
      attendanceParams.push(establishmentIds);
      attendanceIdx++;
    }
    attendanceQuery += this.appendScopeToSql(attendanceParams, scopeFilter, 's');

    const attendanceResult = await this.userRepository.manager.query(attendanceQuery, attendanceParams);
    const totalAttendance = Number(attendanceResult[0]?.total || 0);
    const presentCount = Number(attendanceResult[0]?.present || 0);
    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    // ── stat-students-accompanied ──────────────────────────────────
    // Count students whose account status is 'accompanied' (not session presence).
    const accompaniedParams: any[] = [companyId];
    let accompaniedEstablishmentClause = '';
    if (establishmentIds?.length) {
      accompaniedParams.push(establishmentIds);
      accompaniedEstablishmentClause = ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${accompaniedParams.length})
      )`;
    }
    accompaniedEstablishmentClause += this.appendUserScopeToSql(accompaniedParams, scopeFilter, 'u');
    const accompaniedResult = await this.userRepository.manager.query(
      `SELECT COUNT(DISTINCT u.id) as count
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE u.company_id = $1
         AND r.code = 'student'
         AND u.status = 'accompanied'
         AND u.deleted_at IS NULL
         AND r.deleted_at IS NULL
         ${accompaniedEstablishmentClause}`,
      accompaniedParams,
    );
    const studentsAccompanied = Number(accompaniedResult[0]?.count || 0);

    return {
      'stat-students-active': {
        id: 'stat-students-active',
        value: activeStudentsCount,
        trend: newStudents > 0 ? { value: newStudents, isPositive: true } : undefined,
        description: `${newStudents} nouveaux`,
      },
      'stat-students-accompanied': {
        id: 'stat-students-accompanied',
        value: studentsAccompanied,
        description: 'Élèves avec statut accompagné',
      },
      'stat-students-new': {
        id: 'stat-students-new',
        value: newStudents,
        trend: previousNewStudents > 0
          ? { value: Math.round(Math.abs(newStudentsTrend) * 10) / 10, isPositive: newStudentsTrend >= 0 }
          : undefined,
      },
      'stat-attendance-rate': {
        id: 'stat-attendance-rate',
        value: `${Math.round(attendanceRate)}%`,
        description: `${presentCount} présences sur ${totalAttendance}`,
      },
    };
  }

  private async calculateTutorsStats(
    companyId: string,
    dateFilter: any,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<Record<string, DashboardStatDto>> {
    if (scopeFilter.kind === 'empty') {
      return { 'stat-tutors-active': { id: 'stat-tutors-active', value: 0 } };
    }

    const establishmentIds = this.getEstablishmentIds(query);

    const params: any[] = [companyId];
    let idx = 2;

    // Base: users with role code 'tutor', active, not deleted, same company
    let sql = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE u.company_id = $1
        AND r.code = 'tutor'
        AND u.status = 'active'
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL
    `;

    // Filter by establishmentIds query param if provided
    if (establishmentIds?.length) {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(establishmentIds);
      idx++;
    }

    // Apply visibility scope — adapted for users (not sessions)
    if (scopeFilter.kind === 'establishment_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    } else if (scopeFilter.kind === 'session_ids') {
      // Tutor scope: only tutors participating in the visible sessions
      sql += ` AND EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.user_id = u.id
          AND sp.role IN ('tutor', 'volunteer')
          AND sp.session_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    }

    const result = await this.userRepository.manager.query(sql, params);
    return {
      'stat-tutors-active': {
        id: 'stat-tutors-active',
        value: Number(result[0]?.count || 0),
        description: 'Bénévoles actifs (rôle tuteur, statut actif)',
      },
    };
  }

  private async calculateEstablishmentsStats(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<Record<string, DashboardStatDto>> {
    const establishmentIds = this.getEstablishmentIds(query);
    const where: any = { companyId };
    if (establishmentIds?.length) where.id = In(establishmentIds);

    // For establishment count, scope by establishment IDs if applicable
    if (scopeFilter.kind === 'establishment_ids') {
      const scopeEstIds = scopeFilter.ids;
      where.id = establishmentIds?.length ? In(establishmentIds.filter((id) => scopeEstIds.includes(id))) : In(scopeEstIds);
    }

    const totalEstablishments = await this.establishmentRepository.count({ where });

    const params: any[] = [companyId];
    let idx = 2;
    let activeQuery = `
      SELECT COUNT(DISTINCT s.establishment_id) as count
      FROM sessions s
      WHERE s.company_id = $1 AND s.establishment_id IS NOT NULL AND s.status != 'CANCELLED'
    `;
    if (query.dateFrom) {
      activeQuery += ` AND s.session_date >= $${idx}`;
      params.push(query.dateFrom);
      idx++;
    }
    if (query.dateTo) {
      activeQuery += ` AND s.session_date <= $${idx}`;
      params.push(query.dateTo);
      idx++;
    }
    if (query.schoolYearId) {
      activeQuery += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }
    if (establishmentIds?.length) {
      activeQuery += ` AND s.establishment_id = ANY($${idx})`;
      params.push(establishmentIds);
      idx++;
    }
    activeQuery += this.appendScopeToSql(params, scopeFilter, 's');

    const result = await this.userRepository.manager.query(activeQuery, params);
    const establishmentsActive = Number(result[0]?.count || 0);

    return {
      'stat-establishments': {
        id: 'stat-establishments',
        value: totalEstablishments,
        description: `${establishmentsActive} avec activité`,
      },
    };
  }

  private async calculateVscReportsStats(
    companyId: string,
    dateFilter: any,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<Record<string, DashboardStatDto>> {
    const where: any = { companyId };
    const establishmentIds = this.getEstablishmentIds(query);
    if (dateFilter) where.periodStart = dateFilter;

    // VSC reports filter by establishment when scope is establishment-based
    if (scopeFilter.kind === 'establishment_ids') {
      const scopeEstIds = scopeFilter.ids;
      const finalEstIds = establishmentIds?.length
        ? establishmentIds.filter((id) => scopeEstIds.includes(id))
        : scopeEstIds;
      if (finalEstIds.length) where.establishmentId = In(finalEstIds);
    } else if (establishmentIds?.length) {
      where.establishmentId = In(establishmentIds);
    }

    if (scopeFilter.kind === 'empty') {
      return { 'stat-vsc-reports': { id: 'stat-vsc-reports', value: 0, description: '0 quotidiens, 0 hebdomadaires' } };
    }

    const [totalVscReports, dailyReports, weeklyReports] = await Promise.all([
      this.vscReportRepository.count({ where }),
      this.vscReportRepository.count({ where: { ...where, category: 'daily' } }),
      this.vscReportRepository.count({ where: { ...where, category: 'weekly' } }),
    ]);

    return {
      'stat-vsc-reports': {
        id: 'stat-vsc-reports',
        value: totalVscReports,
        description: `${dailyReports} quotidiens, ${weeklyReports} hebdomadaires`,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // NOUVEAUX KPIs
  // ═══════════════════════════════════════════════════════════════

  private async calculateNewKpis(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<Record<string, DashboardStatDto>> {
    const [
      accompaniedMin3,
      completedSessionsCount,
      hoursTotal,
      hoursIndividual,
      hoursCollective,
      studentsCollective,
      studentsIndividualInPerson,
      studentsOnline,
      dropoutsInPerson,
      dropoutsOnline,
      studentsByLevel,
      studentsLycee,
      studentsProfessionnel,
      tutorsByProfessionalSituation,
      civicServiceYouth,
      avgVscContractMonths,
      tutorDropouts,
    ] = await Promise.all([
      this.countAccompaniedStudentsMin3(companyId, query, scopeFilter),
      this.countCompletedSessions(companyId, query, scopeFilter),
      this.sumHours(companyId, query, scopeFilter, {}),
      this.sumHours(companyId, query, scopeFilter, { type: 'individual_tutoring' }),
      this.sumHours(companyId, query, scopeFilter, {
        types: ['workshop', 'homework_help', 'group_tutoring'],
        format: 'in_person',
      }),
      this.countStudentsBySessionFilter(companyId, query, scopeFilter, {
        types: ['workshop', 'homework_help', 'group_tutoring'],
        format: 'in_person',
      }),
      this.countStudentsBySessionFilter(companyId, query, scopeFilter, {
        type: 'individual_tutoring',
        format: 'in_person',
      }),
      this.countStudentsBySessionFilter(companyId, query, scopeFilter, {
        format: 'remote',
      }),
      this.countDropoutsBySessionFormat(companyId, scopeFilter, 'in_person'),
      this.countDropoutsBySessionFormat(companyId, scopeFilter, 'remote'),
      this.countStudentsByLevel(companyId, query, scopeFilter),
      this.countStudentsByEstablishmentType(companyId, query, scopeFilter, 'lycee'),
      this.countStudentsByEstablishmentType(companyId, query, scopeFilter, 'professionnel'),
      this.countTutorsByProfessionalSituation(companyId, query, scopeFilter),
      this.countCivicServiceYouth(companyId, query, scopeFilter),
      this.getAverageVscContractDurationMonths(companyId, query, scopeFilter),
      this.countTutorDropouts(companyId, query, scopeFilter),
    ]);

    return {
      'stat-students-accompanied-min3': {
        id: 'stat-students-accompanied-min3',
        value: accompaniedMin3,
        description: 'Élèves accompagnés ayant réalisé au minimum 3 séances',
      },
      'stat-sessions-realized': {
        id: 'stat-sessions-realized',
        value: completedSessionsCount,
        description: 'Séances terminées (COMPLETED + CLOSED), tous formats',
      },
      'stat-hours-total': {
        id: 'stat-hours-total',
        value: hoursTotal,
        description: 'Heures totales réalisées (individuel + collectif, en ligne + présentiel)',
      },
      'stat-hours-individual': {
        id: 'stat-hours-individual',
        value: hoursIndividual,
        description: 'Heures de tutorat individuel réalisées (en ligne + présentiel)',
      },
      'stat-hours-collective': {
        id: 'stat-hours-collective',
        value: hoursCollective,
        description: 'Heures d\'accompagnement collectif réalisées en présentiel',
      },
      'stat-students-collective': {
        id: 'stat-students-collective',
        value: studentsCollective,
        description: 'Élèves affectés à des séances collectives en présentiel',
      },
      'stat-students-individual': {
        id: 'stat-students-individual',
        value: studentsIndividualInPerson,
        description: 'Élèves bénéficiant d\'un accompagnement individuel en présentiel',
      },
      'stat-students-online': {
        id: 'stat-students-online',
        value: studentsOnline,
        description:
          'Élèves distincts ayant participé à au moins une séance à distance (remote ; hors hybrid)',
      },
      'stat-dropouts-inperson': {
        id: 'stat-dropouts-inperson',
        value: dropoutsInPerson,
        description:
          'Élèves désactivés ayant participé à au moins une séance en présentiel (périmètre visible)',
      },
      'stat-dropouts-online': {
        id: 'stat-dropouts-online',
        value: dropoutsOnline,
        description:
          'Élèves désactivés ayant participé à au moins une séance à distance (remote ; hors hybrid)',
      },
      'stat-students-by-level': {
        id: 'stat-students-by-level',
        value: studentsByLevel.total,
        description: `Primaire: ${studentsByLevel.primary} | Collège: ${studentsByLevel.middle} | Lycée: ${studentsByLevel.high}`,
      },
      'stat-students-primary': {
        id: 'stat-students-primary',
        value: studentsByLevel.primary,
        description: 'Élèves inscrits et suivis au niveau primaire',
      },
      'stat-students-college': {
        id: 'stat-students-college',
        value: studentsByLevel.middle,
        description: 'Élèves inscrits et suivis au niveau collège',
      },
      'stat-students-general': {
        id: 'stat-students-general',
        value: studentsLycee,
        description: 'Élèves au lycée général',
      },
      'stat-students-professionnel': {
        id: 'stat-students-professionnel',
        value: studentsProfessionnel,
        description: 'Élèves au lycée professionnel',
      },
      'stat-students-lycee': {
        id: 'stat-students-lycee',
        value: studentsLycee + studentsProfessionnel,
        description: 'Total élèves au lycée (général + professionnel)',
      },
      'stat-volunteers-employed': {
        id: 'stat-volunteers-employed',
        value: tutorsByProfessionalSituation.employee,
        description: 'Tuteurs actifs avec situation professionnelle « salarié »',
      },
      'stat-volunteers-retired': {
        id: 'stat-volunteers-retired',
        value: tutorsByProfessionalSituation.retired,
        description: 'Tuteurs actifs avec situation professionnelle « retraité »',
      },
      'stat-volunteers-student': {
        id: 'stat-volunteers-student',
        value: tutorsByProfessionalSituation.student,
        description: 'Tuteurs actifs avec situation professionnelle « étudiant »',
      },
      'stat-volunteers-dropouts': {
        id: 'stat-volunteers-dropouts',
        value: tutorDropouts,
        description: "Tuteurs désactivés avant leur date de fin d'engagement",
      },
      'stat-civicservice-youth': {
        id: 'stat-civicservice-youth',
        value: civicServiceYouth,
        description: 'Utilisateurs actifs avec rôle VSC (volunteer)',
      },
      'stat-civicservice-avg-contract': {
        id: 'stat-civicservice-avg-contract',
        value: avgVscContractMonths,
        description: 'Durée moyenne de contrat (mois), VSC actifs',
      },
    };
  }

  /**
   * Répartition des tuteurs actifs par situation professionnelle (profil).
   */
  private async countTutorsByProfessionalSituation(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<{ employee: number; student: number; retired: number }> {
    if (scopeFilter.kind === 'empty') {
      return { employee: 0, student: 0, retired: 0 };
    }

    const establishmentIds = this.getEstablishmentIds(query);
    const params: any[] = [companyId];
    let idx = 2;

    let sql = `
      SELECT up.professional_situation, COUNT(DISTINCT u.id) as count
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN user_profiles up ON up.user_id = u.id
      WHERE u.company_id = $1
        AND r.code = 'tutor'
        AND u.status = 'active'
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND up.professional_situation IS NOT NULL
    `;

    if (establishmentIds?.length) {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(establishmentIds);
      idx++;
    }

    if (scopeFilter.kind === 'establishment_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    } else if (scopeFilter.kind === 'session_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.user_id = u.id
          AND sp.role IN ('tutor', 'volunteer')
          AND sp.session_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    }

    sql += ` GROUP BY up.professional_situation`;

    const rows = await this.userRepository.manager.query(sql, params);
    const map: Record<string, number> = { employee: 0, student: 0, retired: 0 };
    for (const row of rows) {
      const k = row.professional_situation as string;
      if (k in map) map[k] = Number(row.count);
    }
    return {
      employee: map.employee,
      student: map.student,
      retired: map.retired,
    };
  }

  /**
   * Tuteurs désactivés avant la date de fin d'engagement prévue (abandon anticipé).
   */
  private async countTutorDropouts(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<number> {
    if (scopeFilter.kind === 'empty') {
      return 0;
    }

    const establishmentIds = this.getEstablishmentIds(query);
    const params: any[] = [companyId];
    let idx = 2;

    let sql = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN user_profiles up ON up.user_id = u.id
      WHERE u.company_id = $1
        AND r.code = 'tutor'
        AND u.status = 'deactivated'
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND up.engagement_end_date IS NOT NULL
        AND up.engagement_end_date > CURRENT_DATE
    `;

    if (establishmentIds?.length) {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(establishmentIds);
      idx++;
    }

    if (scopeFilter.kind === 'establishment_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    } else if (scopeFilter.kind === 'session_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.user_id = u.id
          AND sp.role IN ('tutor', 'volunteer')
          AND sp.session_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    }

    const result = await this.userRepository.manager.query(sql, params);
    return Number(result[0]?.count || 0);
  }

  /**
   * Nombre d'utilisateurs actifs avec le rôle VSC (code volunteer).
   */
  private async countCivicServiceYouth(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<number> {
    if (scopeFilter.kind === 'empty') {
      return 0;
    }

    const establishmentIds = this.getEstablishmentIds(query);
    const params: any[] = [companyId];
    let idx = 2;

    let sql = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE u.company_id = $1
        AND r.code = 'volunteer'
        AND u.status = 'active'
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL
    `;

    if (establishmentIds?.length) {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(establishmentIds);
      idx++;
    }

    if (scopeFilter.kind === 'establishment_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    } else if (scopeFilter.kind === 'session_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.user_id = u.id
          AND sp.role IN ('tutor', 'volunteer')
          AND sp.session_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    }

    const result = await this.userRepository.manager.query(sql, params);
    return Number(result[0]?.count || 0);
  }

  /**
   * Durée moyenne de contrat VSC (mois) : SUM(fin − début) / COUNT(VSC actifs), hors professeurs.
   */
  private async getAverageVscContractDurationMonths(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<number> {
    if (scopeFilter.kind === 'empty') {
      return 0;
    }

    const establishmentIds = this.getEstablishmentIds(query);
    const params: any[] = [companyId];
    let idx = 2;

    let sql = `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN up.engagement_start_date IS NOT NULL AND up.engagement_end_date IS NOT NULL
            THEN GREATEST(
              0,
              up.engagement_end_date::date - up.engagement_start_date::date
            )
            ELSE 0
          END
        ), 0)::float AS sum_days,
        COUNT(DISTINCT u.id)::float AS total_vsc
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.company_id = $1
        AND r.code = 'volunteer'
        AND u.status = 'active'
        AND u.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_roles ur2
          INNER JOIN roles r2 ON r2.id = ur2.role_id
          WHERE ur2.user_id = u.id
            AND r2.code = 'professor'
            AND r2.deleted_at IS NULL
        )
    `;

    if (establishmentIds?.length) {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(establishmentIds);
      idx++;
    }

    if (scopeFilter.kind === 'establishment_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_establishments ue
        WHERE ue.user_id = u.id AND ue.establishment_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    } else if (scopeFilter.kind === 'session_ids') {
      sql += ` AND EXISTS (
        SELECT 1 FROM session_participants sp
        WHERE sp.user_id = u.id
          AND sp.role IN ('tutor', 'volunteer')
          AND sp.session_id = ANY($${idx})
      )`;
      params.push(scopeFilter.ids);
      idx++;
    }

    const result = await this.userRepository.manager.query(sql, params);
    const sumDays = Number(result[0]?.sum_days || 0);
    const totalVsc = Number(result[0]?.total_vsc || 0);
    if (totalVsc === 0) {
      return 0;
    }
    const avgDays = sumDays / totalVsc;
    return Math.round((avgDays / 30.4375) * 10) / 10;
  }

  /**
   * Élèves accompagnés ayant participé (présents) à au moins 3 séances COMPLETED/CLOSED.
   */
  private async countAccompaniedStudentsMin3(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<number> {
    const params: any[] = [companyId];
    let idx = 2;
    let sql = `
      SELECT COUNT(*) as count FROM (
        SELECT sp.user_id
        FROM session_participants sp
        JOIN sessions s ON s.id = sp.session_id
        WHERE s.company_id = $1
          AND sp.role = 'student'
          AND sp.attendance_status = 'present'
          AND s.status IN ('COMPLETED', 'CLOSED')
    `;
    if (query.dateFrom) {
      sql += ` AND s.session_date >= $${idx}`;
      params.push(query.dateFrom);
      idx++;
    }
    if (query.dateTo) {
      sql += ` AND s.session_date <= $${idx}`;
      params.push(query.dateTo);
      idx++;
    }
    if (query.schoolYearId) {
      sql += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }
    sql += this.appendScopeToSql(params, scopeFilter, 's');
    sql += `
        GROUP BY sp.user_id
        HAVING COUNT(*) >= 3
      ) t
    `;
    const result = await this.userRepository.manager.query(sql, params);
    return Number(result[0]?.count || 0);
  }

  /**
   * Nombre total de séances terminées (COMPLETED + CLOSED).
   */
  private async countCompletedSessions(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<number> {
    const params: any[] = [companyId];
    let idx = 2;
    let sql = `
      SELECT COUNT(*) as count FROM sessions s
      WHERE s.company_id = $1 AND s.status IN ('COMPLETED', 'CLOSED')
    `;
    if (query.dateFrom) {
      sql += ` AND s.session_date >= $${idx}`;
      params.push(query.dateFrom);
      idx++;
    }
    if (query.dateTo) {
      sql += ` AND s.session_date <= $${idx}`;
      params.push(query.dateTo);
      idx++;
    }
    if (query.schoolYearId) {
      sql += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }
    sql += this.appendScopeToSql(params, scopeFilter, 's');
    const result = await this.userRepository.manager.query(sql, params);
    return Number(result[0]?.count || 0);
  }

  /**
   * Somme des heures de séances terminées avec filtres optionnels sur type/format.
   * Calcul basé sur EXTRACT(EPOCH FROM end_time - start_time) en heures.
   */
  private async sumHours(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
    filters: { type?: string; types?: string[]; format?: string },
  ): Promise<number> {
    const params: any[] = [companyId];
    let idx = 2;
    let sql = `
      SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600.0
      ), 0) as total_hours
      FROM sessions s
      WHERE s.company_id = $1
        AND s.status IN ('COMPLETED', 'CLOSED')
    `;
    if (filters.type) {
      sql += ` AND s.type = $${idx}`;
      params.push(filters.type);
      idx++;
    } else if (filters.types?.length) {
      sql += ` AND s.type = ANY($${idx})`;
      params.push(filters.types);
      idx++;
    }
    if (filters.format) {
      sql += ` AND s.session_format = $${idx}`;
      params.push(filters.format);
      idx++;
    }
    if (query.dateFrom) {
      sql += ` AND s.session_date >= $${idx}`;
      params.push(query.dateFrom);
      idx++;
    }
    if (query.dateTo) {
      sql += ` AND s.session_date <= $${idx}`;
      params.push(query.dateTo);
      idx++;
    }
    if (query.schoolYearId) {
      sql += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }
    sql += this.appendScopeToSql(params, scopeFilter, 's');
    const result = await this.userRepository.manager.query(sql, params);
    return Math.round(Number(result[0]?.total_hours || 0) * 10) / 10;
  }

  /**
   * Nombre d'élèves distincts présents dans des séances filtrées par type/format.
   */
  private async countStudentsBySessionFilter(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
    filters: { type?: string; types?: string[]; format?: string },
  ): Promise<number> {
    const params: any[] = [companyId];
    let idx = 2;
    let sql = `
      SELECT COUNT(DISTINCT sp.user_id) as count
      FROM session_participants sp
      JOIN sessions s ON s.id = sp.session_id
      WHERE s.company_id = $1 AND sp.role = 'student'
    `;
    if (filters.type) {
      sql += ` AND s.type = $${idx}`;
      params.push(filters.type);
      idx++;
    } else if (filters.types?.length) {
      sql += ` AND s.type = ANY($${idx})`;
      params.push(filters.types);
      idx++;
    }
    if (filters.format) {
      sql += ` AND s.session_format = $${idx}`;
      params.push(filters.format);
      idx++;
    }
    if (query.dateFrom) {
      sql += ` AND s.session_date >= $${idx}`;
      params.push(query.dateFrom);
      idx++;
    }
    if (query.dateTo) {
      sql += ` AND s.session_date <= $${idx}`;
      params.push(query.dateTo);
      idx++;
    }
    if (query.schoolYearId) {
      sql += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }
    sql += this.appendScopeToSql(params, scopeFilter, 's');
    const result = await this.userRepository.manager.query(sql, params);
    return Number(result[0]?.count || 0);
  }

  /**
   * Élèves abandons par format de séance : élèves `deactivated` avec au moins une participation
   * élève sur une séance du format demandé (`in_person` ou `remote`). Les séances sont filtrées
   * par `appendScopeToSql` (cohérent avec les autres KPI séances). Le cas `hybrid` n'est pas compté
   * dans « en ligne » ni dans « présentiel » ici — à affiner métier si besoin.
   */
  private async countDropoutsBySessionFormat(
    companyId: string,
    scopeFilter: SessionScopeFilter,
    sessionFormat: 'in_person' | 'remote',
  ): Promise<number> {
    const dropoutParams: any[] = [companyId];
    const userScopeSql = this.appendUserScopeToSql(dropoutParams, scopeFilter, 'u');
    dropoutParams.push(sessionFormat);
    const formatParamIndex = dropoutParams.length;
    const sessionScopeSql = this.appendScopeToSql(dropoutParams, scopeFilter, 'sd');
    const result = await this.userRepository.manager.query(
      `SELECT COUNT(DISTINCT u.id) as count
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE u.company_id = $1
         AND r.code = 'student'
         AND u.status = 'deactivated'
         AND u.deleted_at IS NULL
         AND r.deleted_at IS NULL
         ${userScopeSql}
         AND EXISTS (
           SELECT 1
           FROM session_participants sp_d
           INNER JOIN sessions sd ON sd.id = sp_d.session_id
           WHERE sp_d.user_id = u.id
             AND sp_d.role = 'student'
             AND sd.company_id = u.company_id
             AND sd.session_format = $${formatParamIndex}
             ${sessionScopeSql}
         )`,
      dropoutParams,
    );
    return Number(result[0]?.count || 0);
  }

  /**
   * Répartition des élèves par cycle d'enseignement (primary/middle/high)
   * via la table `levels` et les level_ids JSONB des séances.
   */
  private async countStudentsByLevel(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
  ): Promise<{ primary: number; middle: number; high: number; total: number }> {
    const params: any[] = [companyId];
    let idx = 2;
    let sql = `
      SELECT l.education_cycle, COUNT(DISTINCT sp.user_id) as count
      FROM session_participants sp
      JOIN sessions s ON s.id = sp.session_id
      JOIN LATERAL jsonb_array_elements_text(s.level_ids) lid(val) ON TRUE
      JOIN levels l ON l.id::text = lid.val AND l.company_id = $1
      WHERE s.company_id = $1
        AND sp.role = 'student'
        AND l.education_cycle IS NOT NULL
    `;
    if (query.dateFrom) {
      sql += ` AND s.session_date >= $${idx}`;
      params.push(query.dateFrom);
      idx++;
    }
    if (query.dateTo) {
      sql += ` AND s.session_date <= $${idx}`;
      params.push(query.dateTo);
      idx++;
    }
    if (query.schoolYearId) {
      sql += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }
    sql += this.appendScopeToSql(params, scopeFilter, 's');
    sql += ` GROUP BY l.education_cycle`;

    const rows = await this.userRepository.manager.query(sql, params);
    const map: Record<string, number> = { primary: 0, middle: 0, high: 0 };
    for (const row of rows) {
      if (row.education_cycle in map) map[row.education_cycle] = Number(row.count);
    }
    return {
      primary: map.primary,
      middle: map.middle,
      high: map.high,
      total: map.primary + map.middle + map.high,
    };
  }

  /**
   * Nombre d'élèves distincts dans des séances rattachées à un établissement du type demandé.
   */
  private async countStudentsByEstablishmentType(
    companyId: string,
    query: DashboardStatsQueryDto,
    scopeFilter: SessionScopeFilter,
    establishmentType: string,
  ): Promise<number> {
    const params: any[] = [companyId, establishmentType];
    let idx = 3;
    let sql = `
      SELECT COUNT(DISTINCT sp.user_id) as count
      FROM session_participants sp
      JOIN sessions s ON s.id = sp.session_id
      JOIN establishments e ON e.id = s.establishment_id
      WHERE s.company_id = $1
        AND sp.role = 'student'
        AND e.type = $2
    `;
    if (query.dateFrom) {
      sql += ` AND s.session_date >= $${idx}`;
      params.push(query.dateFrom);
      idx++;
    }
    if (query.dateTo) {
      sql += ` AND s.session_date <= $${idx}`;
      params.push(query.dateTo);
      idx++;
    }
    if (query.schoolYearId) {
      sql += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }
    sql += this.appendScopeToSql(params, scopeFilter, 's');
    const result = await this.userRepository.manager.query(sql, params);
    return Number(result[0]?.count || 0);
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTHODES POUR LES GRAPHIQUES MANAGER
  // ═══════════════════════════════════════════════════════════════

  async getDashboardCharts(companyId: string, query: DashboardStatsQueryDto) {
    const dateFilter = this.buildDateFilter(query);

    return {
      sessionsByEstablishment: await this.getSessionsByEstablishment(companyId, dateFilter, query),
      resourcesByEstablishment: await this.getResourcesByEstablishment(companyId, dateFilter, query),
    };
  }

  private async getSessionsByEstablishment(
    companyId: string,
    dateFilter: any,
    query: DashboardStatsQueryDto,
  ) {
    const establishmentIds = this.getEstablishmentIds(query);
    const hasDateRange = !!(query.dateFrom && query.dateTo);

    const params: any[] = [companyId];
    let idx = 2;
    let joinConditions = '';
    if (hasDateRange) {
      joinConditions += ` AND s.session_date BETWEEN $${idx} AND $${idx + 1}`;
      params.push(query.dateFrom, query.dateTo);
      idx += 2;
    }
    if (query.schoolYearId) {
      joinConditions += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }

    const establishmentWhereCondition = establishmentIds?.length ? ` AND e.id = ANY($${idx})` : '';
    if (establishmentIds?.length) params.push(establishmentIds);

    // When no establishment filter: limit to top 10 by total sessions (DB-level sort+limit).
    // When a filter is active: return all selected establishments sorted by total.
    const limitClause = establishmentIds?.length ? '' : 'LIMIT 10';

    // COMPLETED is never written to the DB (see SESSION_STATUS_TRANSITIONS.md).
    // It is derived at read-time by getEffectiveStatus(): stored PLANNED or IN_PROGRESS
    // sessions whose wall-clock end time has passed (interpreted in establishment timezone).
    // We replicate the same logic here with TIMEZONE(tz, date+time) so the chart shows real data.
    const TZ = `COALESCE(e.timezone, 'Europe/Paris')`;
    const effectiveEnd   = `TIMEZONE(${TZ}, (s.session_date + s.end_time)::timestamp)`;
    const effectiveStart = `TIMEZONE(${TZ}, (s.session_date + s.start_time)::timestamp)`;

    const sql = `
      WITH counts AS (
        SELECT
          e.name as establishment_name,
          e.id   as establishment_id,
          -- PLANNED: stored PLANNED + start not yet reached
          COUNT(CASE
            WHEN s.status = 'PLANNED'
              AND (s.start_time IS NULL OR ${effectiveStart} > NOW())
            THEN 1 END) as planned,
          -- IN_PROGRESS (effective): start passed, end not yet passed
          COUNT(CASE
            WHEN s.status IN ('PLANNED', 'IN_PROGRESS')
              AND s.start_time IS NOT NULL
              AND ${effectiveStart} <= NOW()
              AND (s.end_time IS NULL OR ${effectiveEnd} > NOW())
            THEN 1 END) as in_progress,
          -- COMPLETED (effective): end time known and passed (mirrors getEffectiveStatus)
          COUNT(CASE
            WHEN s.status IN ('PLANNED', 'IN_PROGRESS')
              AND s.end_time IS NOT NULL
              AND ${effectiveEnd} <= NOW()
            THEN 1 END) as completed,
          -- CLOSED / CANCELLED: stored terminal states, unchanged
          COUNT(CASE WHEN s.status = 'CLOSED'    THEN 1 END) as closed,
          COUNT(CASE WHEN s.status = 'CANCELLED' THEN 1 END) as cancelled
        FROM establishments e
        LEFT JOIN sessions s ON s.establishment_id = e.id AND s.company_id = $1 ${joinConditions}
        WHERE e.company_id = $1 ${establishmentWhereCondition}
        GROUP BY e.id, e.name
      )
      SELECT * FROM counts
      ORDER BY (planned + in_progress + completed + closed + cancelled) DESC, establishment_name ASC
      ${limitClause}
    `;

    const result = await this.userRepository.manager.query(sql, params);
    return {
      categories: result.map((r: any) => r.establishment_name),
      series: [
        { name: 'Planifiées', data: result.map((r: any) => Number(r.planned)) },
        { name: 'En cours', data: result.map((r: any) => Number(r.in_progress)) },
        { name: 'Terminées', data: result.map((r: any) => Number(r.completed)) },
        { name: 'Clôturées', data: result.map((r: any) => Number(r.closed)) },
        { name: 'Annulées', data: result.map((r: any) => Number(r.cancelled)) },
      ],
    };
  }

  private async getResourcesByEstablishment(
    companyId: string,
    dateFilter: any,
    query: DashboardStatsQueryDto,
  ) {
    const establishmentIds = this.getEstablishmentIds(query);
    const hasDateRange = !!(query.dateFrom && query.dateTo);

    const params: any[] = [companyId];
    let idx = 2;
    let joinConditions = '';
    if (hasDateRange) {
      joinConditions += ` AND s.session_date BETWEEN $${idx} AND $${idx + 1}`;
      params.push(query.dateFrom, query.dateTo);
      idx += 2;
    }
    if (query.schoolYearId) {
      joinConditions += ` AND s.school_year_id = $${idx}`;
      params.push(query.schoolYearId);
      idx++;
    }

    // Save the index of the establishment IDs param so all CTEs can reuse the same $N
    const estParamIdx = idx;
    const establishmentWhereCondition = establishmentIds?.length ? ` AND e.id = ANY($${idx})` : '';
    const estCteCondition = establishmentIds?.length ? ` AND ue.establishment_id = ANY($${estParamIdx})` : '';
    if (establishmentIds?.length) {
      params.push(establishmentIds);
      idx++;
    }

    const limitClause = establishmentIds?.length ? '' : 'LIMIT 10';

    // Coordinators and VSC users are counted via their role code (same pattern as calculateTutorsStats),
    // not via user_profiles/profiles or vsc_reports, which caused incorrect zero values.
    const sql = `
      WITH session_counts AS (
        SELECT
          e.id   AS establishment_id,
          e.name AS establishment_name,
          COUNT(DISTINCT CASE WHEN sp.role = 'student'               THEN sp.user_id END) AS students_count,
          COUNT(DISTINCT CASE WHEN sp.role IN ('tutor', 'volunteer') THEN sp.user_id END) AS tutors_count
        FROM establishments e
        LEFT JOIN sessions s             ON s.establishment_id = e.id AND s.company_id = $1 ${joinConditions}
        LEFT JOIN session_participants sp ON sp.session_id = s.id
        WHERE e.company_id = $1 ${establishmentWhereCondition}
        GROUP BY e.id, e.name
      ),
      coordinator_counts AS (
        SELECT ue.establishment_id, COUNT(DISTINCT u.id) AS coordinators_count
        FROM users u
        INNER JOIN user_roles ur          ON ur.user_id = u.id
        INNER JOIN roles r                ON r.id = ur.role_id AND r.company_id = $1 AND r.deleted_at IS NULL
        INNER JOIN user_establishments ue ON ue.user_id = u.id
        WHERE u.company_id = $1
          AND LOWER(r.code) = 'coordinator'
          AND u.status = 'active'
          AND u.deleted_at IS NULL
          ${estCteCondition}
        GROUP BY ue.establishment_id
      ),
      vsc_counts AS (
        SELECT ue.establishment_id, COUNT(DISTINCT u.id) AS vsc_count
        FROM users u
        INNER JOIN user_roles ur          ON ur.user_id = u.id
        INNER JOIN roles r                ON r.id = ur.role_id AND r.company_id = $1 AND r.deleted_at IS NULL
        INNER JOIN user_establishments ue ON ue.user_id = u.id
        WHERE u.company_id = $1
          AND LOWER(r.code) = 'volunteer'
          AND u.status = 'active'
          AND u.deleted_at IS NULL
          ${estCteCondition}
        GROUP BY ue.establishment_id
      )
      SELECT
        sc.establishment_id,
        sc.establishment_name,
        sc.students_count,
        sc.tutors_count,
        COALESCE(cc.coordinators_count, 0) AS coordinators_count,
        COALESCE(vc.vsc_count, 0)          AS vsc_count
      FROM session_counts sc
      LEFT JOIN coordinator_counts cc ON cc.establishment_id = sc.establishment_id
      LEFT JOIN vsc_counts vc         ON vc.establishment_id = sc.establishment_id
      ORDER BY (sc.students_count + sc.tutors_count + COALESCE(cc.coordinators_count, 0) + COALESCE(vc.vsc_count, 0)) DESC,
               sc.establishment_name ASC
      ${limitClause}
    `;

    const result = await this.userRepository.manager.query(sql, params);
    return {
      categories: result.map((r: any) => r.establishment_name),
      series: [
        { name: 'Élèves', data: result.map((r: any) => Number(r.students_count)) },
        { name: 'Tuteurs', data: result.map((r: any) => Number(r.tutors_count)) },
        { name: 'Coordinateurs', data: result.map((r: any) => Number(r.coordinators_count)) },
        { name: 'VSC Actifs', data: result.map((r: any) => Number(r.vsc_count)) },
      ],
    };
  }
}
