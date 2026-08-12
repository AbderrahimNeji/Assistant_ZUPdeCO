import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VscReport } from './entities/vsc-report.entity';
import { Session } from './entities/session.entity';
import { Assignment } from './entities/assignment.entity';
import { SessionReport } from './entities/session-report.entity';
import { User } from '../users/entities/user.entity';
import { Establishment } from '../companies/entities/establishment.entity';

interface VscReportMetrics {
  sessionsCompleted: number;
  sessionsClosed: number;
  sessionsCancelled: number;
  assignmentsCreated: number;
  reportsSubmitted: number;
  reportsPending: number;
  reportsValidated: number;
  tutorHours: number;
}

/**
 * Service pour la génération automatique des rapports VSC.
 * Calcule les métriques et crée les rapports périodiques (daily/weekly).
 */
@Injectable()
export class VscReportGenerationService {
  private readonly logger = new Logger(VscReportGenerationService.name);

  constructor(
    @InjectRepository(VscReport)
    private readonly vscReportRepository: Repository<VscReport>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(SessionReport)
    private readonly sessionReportRepository: Repository<SessionReport>,
    @InjectRepository(Establishment)
    private readonly establishmentRepository: Repository<Establishment>,
  ) {}

  /**
   * Génère les rapports journaliers pour un VSC.
   * Génère un rapport pour TOUS les établissements actifs de la company.
   */
  async generateDailyReportForVsc(vsc: User): Promise<void> {
    this.logger.debug(`\n    🔹 generateDailyReportForVsc START for VSC ${vsc.id}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.logger.debug(`    Period: ${today.toISOString()} to ${tomorrow.toISOString()}`);

    this.logger.debug(`    Fetching ALL active establishments for company ${vsc.companyId}...`);
    const establishments = await this.establishmentRepository.find({
      where: { 
        companyId: vsc.companyId,
        status: 'active'
      },
    });
    this.logger.log(`    ✅ Found ${establishments.length} active establishments in company ${vsc.companyId}`);

    if (establishments.length === 0) {
      this.logger.warn(`    ⚠️ No active establishments found in company ${vsc.companyId}`);
      return;
    }

    if (establishments.length > 0) {
      this.logger.debug(`    Establishment IDs: ${establishments.map(e => e.id).join(', ')}`);
    }

    for (const establishment of establishments) {
      this.logger.log(`    → Processing establishment ${establishment.id} (${establishment.name || 'N/A'})`);

      try {
        this.logger.debug(`    Calling generateReportForVsc...`);
        const report = await this.generateReportForVsc(
          vsc.id,
          establishment.id,
          'daily',
          today,
          tomorrow,
        );
        this.logger.log(
          `    ✅ Daily report generated for VSC ${vsc.id} at establishment ${establishment.id} - Report ID: ${report.id}`,
        );
      } catch (error) {
        this.logger.error(
          `    ❌ Failed to generate daily report for VSC ${vsc.id} at establishment ${establishment.id}`,
        );
        this.logger.error(`    Error name: ${error.name}`);
        this.logger.error(`    Error message: ${error.message}`);
        this.logger.error(`    Error code: ${error.code}`);
        this.logger.error(`    Error stack:`, error.stack);
      }
    }
    
    this.logger.debug(`    🔹 generateDailyReportForVsc END for VSC ${vsc.id}\n`);
  }

  /**
   * Génère les rapports hebdomadaires pour un VSC.
   * Génère un rapport pour TOUS les établissements actifs de la company.
   */
  async generateWeeklyReportForVsc(vsc: User): Promise<void> {
    this.logger.debug(`\n    🔹 generateWeeklyReportForVsc START for VSC ${vsc.id}`);
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    this.logger.debug(`    Period: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);

    this.logger.debug(`    Fetching ALL active establishments for company ${vsc.companyId}...`);
    const establishments = await this.establishmentRepository.find({
      where: { 
        companyId: vsc.companyId,
        status: 'active'
      },
    });
    this.logger.log(`    ✅ Found ${establishments.length} active establishments in company ${vsc.companyId}`);

    if (establishments.length === 0) {
      this.logger.warn(`    ⚠️ No active establishments found in company ${vsc.companyId}`);
      return;
    }

    if (establishments.length > 0) {
      this.logger.debug(`    Establishment IDs: ${establishments.map(e => e.id).join(', ')}`);
    }

    for (const establishment of establishments) {
      this.logger.log(`    → Processing establishment ${establishment.id} (${establishment.name || 'N/A'})`);

      try {
        this.logger.debug(`    Calling generateReportForVsc...`);
        const report = await this.generateReportForVsc(
          vsc.id,
          establishment.id,
          'weekly',
          weekStart,
          weekEnd,
        );
        this.logger.log(
          `    ✅ Weekly report generated for VSC ${vsc.id} at establishment ${establishment.id} - Report ID: ${report.id}`,
        );
      } catch (error) {
        this.logger.error(
          `    ❌ Failed to generate weekly report for VSC ${vsc.id} at establishment ${establishment.id}`,
        );
        this.logger.error(`    Error name: ${error.name}`);
        this.logger.error(`    Error message: ${error.message}`);
        this.logger.error(`    Error code: ${error.code}`);
        this.logger.error(`    Error stack:`, error.stack);
      }
    }
    
    this.logger.debug(`    🔹 generateWeeklyReportForVsc END for VSC ${vsc.id}\n`);
  }

  /**
   * Génère un rapport pour un VSC, un établissement et une période donnés.
   */
  async generateReportForVsc(
    vscId: string,
    establishmentId: string,
    category: 'daily' | 'weekly',
    periodStart: Date,
    periodEnd: Date,
  ): Promise<VscReport> {
    this.logger.debug(`      🔸 generateReportForVsc START`);
    this.logger.debug(`      Parameters: vscId=${vscId}, establishmentId=${establishmentId}, category=${category}`);
    this.logger.debug(`      Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    this.logger.debug(`      Step 1: Calculating metrics...`);
    
    let metrics: VscReportMetrics;
    try {
      metrics = await this.calculateMetrics(
        vscId,
        establishmentId,
        periodStart,
        periodEnd,
      );
      this.logger.log(`      ✅ Metrics calculated:`, JSON.stringify(metrics, null, 2));
    } catch (error) {
      this.logger.error(`      ❌ Error calculating metrics:`);
      this.logger.error(`        Error name: ${error.name}`);
      this.logger.error(`        Error message: ${error.message}`);
      this.logger.error(`        Error code: ${error.code}`);
      this.logger.error(`        Error stack:`, error.stack);
      throw error;
    }

    this.logger.debug(`      Step 2: Fetching VSC user entity...`);
    const vsc = await this.sessionRepository.manager.findOne(User, {
      where: { id: vscId },
    });

    if (!vsc) {
      this.logger.error(`      ❌ VSC not found: ${vscId}`);
      throw new Error(`VSC not found: ${vscId}`);
    }
    this.logger.debug(`      ✅ VSC found: ${vsc.id}, companyId: ${vsc.companyId}`);

    this.logger.debug(`      Step 3: Creating report entity...`);
    const report = this.vscReportRepository.create({
      companyId: vsc.companyId,
      vscId,
      establishmentId,
      category,
      periodStart,
      periodEnd,
      status: 'submitted',
      sessionsCompleted: metrics.sessionsCompleted,
      sessionsClosed: metrics.sessionsClosed,
      sessionsCancelled: metrics.sessionsCancelled,
      assignmentsCreated: metrics.assignmentsCreated,
      reportsSubmitted: metrics.reportsSubmitted,
      reportsPending: metrics.reportsPending,
      reportsValidated: metrics.reportsValidated,
      tutorHours: metrics.tutorHours,
    });
    this.logger.debug(`      ✅ Report entity created (not yet saved):`, JSON.stringify({
      companyId: report.companyId,
      vscId: report.vscId,
      establishmentId: report.establishmentId,
      category: report.category,
      status: report.status,
    }, null, 2));

    try {
      this.logger.debug(`      Step 4: Saving report to database...`);
      const savedReport = await this.vscReportRepository.save(report);
      this.logger.log(`      ✅ Report saved successfully with ID: ${savedReport.id}`);
      this.logger.debug(`      🔸 generateReportForVsc END - SUCCESS`);
      return savedReport;
    } catch (error) {
      this.logger.error(`      ❌ Error saving report:`, {
        code: error.code,
        message: error.message,
        detail: error.detail,
        stack: error.stack,
      });
      
      if (error.code === '23505') {
        this.logger.warn(
          `      ⚠️ Report already exists (duplicate key) for VSC ${vscId}, establishment ${establishmentId}, category ${category}, period ${periodStart.toISOString()}`,
        );
        this.logger.debug(`      Fetching existing report...`);
        const existing = await this.vscReportRepository.findOne({
          where: { vscId, establishmentId, category, periodStart },
        });
        if (!existing) {
          this.logger.error(`      ❌ Report should exist but was not found after duplicate key error`);
          throw new Error('Report should exist but was not found');
        }
        this.logger.log(`      ✅ Returning existing report ID: ${existing.id}`);
        this.logger.debug(`      🔸 generateReportForVsc END - EXISTING`);
        return existing;
      }
      this.logger.debug(`      🔸 generateReportForVsc END - ERROR`);
      throw error;
    }
  }

  /**
   * Calcule les métriques pour un VSC sur une période donnée.
   */
  async calculateMetrics(
    vscId: string,
    establishmentId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<VscReportMetrics> {
    this.logger.debug(`        🔸 calculateMetrics START`);
    this.logger.debug(`        vscId=${vscId}, establishmentId=${establishmentId}`);
    this.logger.debug(`        Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    try {
      this.logger.debug(`        Query 1: sessionsCompleted...`);
      const sessionsCompleted = await this.sessionRepository
        .createQueryBuilder('s')
        .where('s.managed_by = :vscId', { vscId })
        .andWhere('s.establishment_id = :establishmentId', { establishmentId })
        .andWhere('s.session_date >= :periodStart', { periodStart })
        .andWhere('s.session_date < :periodEnd', { periodEnd })
        .andWhere('s.status = :status', { status: 'completed' })
        .getCount();
      this.logger.debug(`        ✅ sessionsCompleted = ${sessionsCompleted}`);

      this.logger.debug(`        Query 2: sessionsClosed...`);
      const sessionsClosed = await this.sessionRepository
        .createQueryBuilder('s')
        .where('s.managed_by = :vscId', { vscId })
        .andWhere('s.establishment_id = :establishmentId', { establishmentId })
        .andWhere('s.session_date >= :periodStart', { periodStart })
        .andWhere('s.session_date < :periodEnd', { periodEnd })
        .andWhere('s.status = :status', { status: 'closed' })
        .getCount();
      this.logger.debug(`        ✅ sessionsClosed = ${sessionsClosed}`);

      this.logger.debug(`        Query 3: sessionsCancelled...`);
      const sessionsCancelled = await this.sessionRepository
        .createQueryBuilder('s')
        .where('s.managed_by = :vscId', { vscId })
        .andWhere('s.establishment_id = :establishmentId', { establishmentId })
        .andWhere('s.session_date >= :periodStart', { periodStart })
        .andWhere('s.session_date < :periodEnd', { periodEnd })
        .andWhere('s.status = :status', { status: 'cancelled' })
        .getCount();
      this.logger.debug(`        ✅ sessionsCancelled = ${sessionsCancelled}`);

      this.logger.debug(`        Query 4: assignmentsCreated...`);
      const assignmentsCreated = await this.assignmentRepository
        .createQueryBuilder('a')
        .innerJoin('sessions', 's', 's.id = a.session_id')
        .where('s.managed_by = :vscId', { vscId })
        .andWhere('s.establishment_id = :establishmentId', { establishmentId })
        .andWhere('a.created_at >= :periodStart', { periodStart })
        .andWhere('a.created_at < :periodEnd', { periodEnd })
        .getCount();
      this.logger.debug(`        ✅ assignmentsCreated = ${assignmentsCreated}`);

      this.logger.debug(`        Query 5: reportsSubmitted...`);
      const reportsSubmitted = await this.sessionReportRepository
        .createQueryBuilder('sr')
        .innerJoin('sessions', 's', 's.id = sr.session_id')
        .where('s.managed_by = :vscId', { vscId })
        .andWhere('s.establishment_id = :establishmentId', { establishmentId })
        .andWhere('s.session_date >= :periodStart', { periodStart })
        .andWhere('s.session_date < :periodEnd', { periodEnd })
        .andWhere('sr.status = :status', { status: 'submitted' })
        .getCount();
      this.logger.debug(`        ✅ reportsSubmitted = ${reportsSubmitted}`);

      this.logger.debug(`        Query 6: reportsValidated...`);
      const reportsValidated = await this.sessionReportRepository
        .createQueryBuilder('sr')
        .innerJoin('sessions', 's', 's.id = sr.session_id')
        .where('s.managed_by = :vscId', { vscId })
        .andWhere('s.establishment_id = :establishmentId', { establishmentId })
        .andWhere('s.session_date >= :periodStart', { periodStart })
        .andWhere('s.session_date < :periodEnd', { periodEnd })
        .andWhere('sr.status = :status', { status: 'validated' })
        .getCount();
      this.logger.debug(`        ✅ reportsValidated = ${reportsValidated}`);

      this.logger.debug(`        Query 7: completedSessionsWithReports...`);
      const completedSessionsWithReports = await this.sessionRepository
        .createQueryBuilder('s')
        .leftJoin('session_reports', 'sr', 'sr.session_id = s.id')
        .where('s.managed_by = :vscId', { vscId })
        .andWhere('s.establishment_id = :establishmentId', { establishmentId })
        .andWhere('s.session_date >= :periodStart', { periodStart })
        .andWhere('s.session_date < :periodEnd', { periodEnd })
        .andWhere('s.status = :status', { status: 'completed' })
        .andWhere('sr.id IS NOT NULL')
        .getCount();
      this.logger.debug(`        ✅ completedSessionsWithReports = ${completedSessionsWithReports}`);

      const reportsPending = sessionsCompleted - completedSessionsWithReports;
      this.logger.debug(`        ✅ reportsPending = ${reportsPending} (${sessionsCompleted} - ${completedSessionsWithReports})`);

      this.logger.debug(`        Query 8: tutorHours...`);
      const tutorHoursResult = await this.sessionRepository
        .createQueryBuilder('s')
        .select(
          "SUM(EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)",
          'total_hours',
        )
        .where('s.managed_by = :vscId', { vscId })
        .andWhere('s.establishment_id = :establishmentId', { establishmentId })
        .andWhere('s.session_date >= :periodStart', { periodStart })
        .andWhere('s.session_date < :periodEnd', { periodEnd })
        .andWhere('s.status = :status', { status: 'completed' })
        .getRawOne();

      const tutorHours = Number.parseFloat(tutorHoursResult?.total_hours || '0');
      this.logger.debug(`        ✅ tutorHours = ${tutorHours} (raw: ${tutorHoursResult?.total_hours})`);

      const finalMetrics = {
        sessionsCompleted,
        sessionsClosed,
        sessionsCancelled,
        assignmentsCreated,
        reportsSubmitted,
        reportsPending: Math.max(0, reportsPending),
        reportsValidated,
        tutorHours: Math.round(tutorHours * 100) / 100,
      };

      this.logger.debug(`        🔸 calculateMetrics END`);
      return finalMetrics;
    } catch (error) {
      this.logger.error(`        ❌ ERROR in calculateMetrics:`);
      this.logger.error(`          Error name: ${error.name}`);
      this.logger.error(`          Error message: ${error.message}`);
      this.logger.error(`          Error code: ${error.code}`);
      this.logger.error(`          Error detail: ${error.detail}`);
      this.logger.error(`          Error stack:`, error.stack);
      throw error;
    }
  }
}
