import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sgMail = require('@sendgrid/mail');
import { DateTime } from 'luxon';
import { EstablishmentCoordinator } from '../companies/entities/establishment-coordinator.entity';
import { User } from '../users/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { Company } from '../companies/entities/company.entity';
import { SessionReport } from '../sessions/entities/session-report.entity';
import { getSessionStartDateTime } from '../sessions/session-report-job.utils';
import {
  ACCOUNT_ACTIVATION_BODY,
  ACCOUNT_ACTIVATION_SUBJECT,
  renderMailTemplateHtml,
  SESSION_REPORT_REMINDER_24H_BODY,
  SESSION_REPORT_REMINDER_24H_SUBJECT,
  SESSION_REPORT_REMINDER_96H_BODY,
  SESSION_REPORT_REMINDER_96H_SUBJECT,
  VSC_DAILY_REPORT_BODY,
  VSC_DAILY_REPORT_SUBJECT,
  wrapZupdecoEmailHtml,
} from './zupdeco-transactional-templates';

@Injectable()
export class TransactionalMailService {
  private readonly logger = new Logger(TransactionalMailService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(EstablishmentCoordinator)
    private readonly establishmentCoordinatorRepository: Repository<EstablishmentCoordinator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionParticipant)
    private readonly participantRepository: Repository<SessionParticipant>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(SessionReport)
    private readonly sessionReportRepository: Repository<SessionReport>,
  ) {
    const key = this.config.get<string>('SENDGRID_API_KEY')?.trim();
    if (key) {
      sgMail.setApiKey(key);
    }
  }

  private isMailEnabled(): boolean {
    const raw = this.config.get<string>('TRANSACTIONAL_MAIL_ENABLED');
    if (raw === 'false' || raw === '0') return false;
    const key = this.config.get<string>('SENDGRID_API_KEY')?.trim();
    return Boolean(key);
  }

  private getFrom(): { email: string; name: string } {
    return {
      email: this.config.get<string>('TRANSACTIONAL_MAIL_FROM', 'coordocollege@zupdeco.org'),
      name: this.config.get<string>('TRANSACTIONAL_MAIL_FROM_NAME', 'Équipe Zupdeco'),
    };
  }

  private async companyTimezone(companyId: string): Promise<string> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      select: ['timezone'],
    });
    return company?.timezone?.trim() || 'Europe/Paris';
  }

  private async coordinatorCcEmails(
    establishmentId: string,
    excludeEmail?: string | null,
  ): Promise<string[]> {
    const rows = await this.establishmentCoordinatorRepository.find({
      where: { establishmentId },
      relations: ['coordinator'],
    });
    const norm = excludeEmail?.trim().toLowerCase() ?? '';
    const set = new Set<string>();
    for (const r of rows) {
      const e = r.coordinator?.email?.trim();
      if (!e) continue;
      if (e.toLowerCase() === norm) continue;
      set.add(e);
    }
    return [...set];
  }

  private async studentNamesLine(sessionId: string): Promise<string> {
    const parts = await this.participantRepository.find({
      where: { sessionId, role: 'student' },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    const names = parts
      .map((p) => {
        const u = p.user;
        return (
          u?.displayName?.trim() ||
          `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() ||
          u?.email?.trim() ||
          ''
        );
      })
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }

  private formatFrenchLongDate(dayIso: string, zone: string): string {
    const dt = DateTime.fromISO(dayIso, { zone });
    if (!dt.isValid) return dayIso;
    return dt.setLocale('fr').toLocaleString(DateTime.DATE_FULL);
  }

  /**
   * Reply-To = destinataire principal : « Répondre » va au tuteur/VSC ;
   * To + Cc déjà remplis : « Répondre à tous » inclut le coordinateur en copie.
   */
  async sendVscDailyReportAvailable(params: {
    companyId: string;
    establishmentId: string;
    recipientEmail: string;
    dayKeyIso: string;
  }): Promise<void> {
    const to = params.recipientEmail.trim();
    if (!to) return;

    const zone = await this.companyTimezone(params.companyId);
    const dateDuJour = this.formatFrenchLongDate(params.dayKeyIso, zone);
    const subject = VSC_DAILY_REPORT_SUBJECT;
    const vars = { dateDuJour };
    const htmlInner = renderMailTemplateHtml(VSC_DAILY_REPORT_BODY, vars);
    const html = wrapZupdecoEmailHtml(htmlInner, '#1e40af');
    const cc = await this.coordinatorCcEmails(params.establishmentId, to);

    await this.dispatch({ to, cc, replyTo: to, subject, html });
  }

  async sendSessionReportReminder(params: {
    reportId: string;
    tier: '24h' | '96h';
    /** Tutor / volunteer on the session (or author fallback from scheduler). */
    recipientUserId: string;
  }): Promise<void> {
    const report = await this.sessionReportRepository.findOne({
      where: { id: params.reportId },
    });
    if (!report) return;

    const recipient = await this.userRepository.findOne({
      where: { id: params.recipientUserId, companyId: report.companyId },
      select: ['id', 'email'],
    });
    const to = recipient?.email?.trim();
    if (!to) {
      this.logger.warn(
        `Session report reminder mail skipped: no email for recipient ${params.recipientUserId}`,
      );
      return;
    }

    const session = await this.sessionRepository.findOne({
      where: { id: report.sessionId, companyId: report.companyId },
    });
    if (!session?.establishmentId) {
      this.logger.warn(`Session report reminder mail skipped: session ${report.sessionId} not found`);
      return;
    }

    const zone = await this.companyTimezone(report.companyId);
    const startDt = getSessionStartDateTime(session.sessionDate, session.startTime, zone);
    const sessionDateTime = startDt.setLocale('fr').toLocaleString(DateTime.DATETIME_SHORT);
    const studentNames = await this.studentNamesLine(session.id);

    const subject =
      params.tier === '96h'
        ? SESSION_REPORT_REMINDER_96H_SUBJECT
        : SESSION_REPORT_REMINDER_24H_SUBJECT;
    const bodyTemplate =
      params.tier === '96h' ? SESSION_REPORT_REMINDER_96H_BODY : SESSION_REPORT_REMINDER_24H_BODY;
    const accent = params.tier === '96h' ? '#b91c1c' : '#d97706';
    const vars = { sessionDateTime, studentNames };
    const htmlInner = renderMailTemplateHtml(bodyTemplate, vars);
    const html = wrapZupdecoEmailHtml(htmlInner, accent);

    const cc = await this.coordinatorCcEmails(session.establishmentId, to);

    await this.dispatch({ to, cc, replyTo: to, subject, html });
  }

  /**
   * Account activation invitation (POST /users/invite email path + regenerate).
   * Returns true if the email was actually dispatched (SendGrid enabled), false otherwise.
   */
  async sendAccountActivation(params: {
    to: string;
    firstName?: string | null;
    activationLink: string;
    /** e.g. "14 jours" (see invitation-token.ts). */
    validityLabel: string;
    /** Reference/coordinator display name; falls back to a generic mention. */
    referentName?: string | null;
  }): Promise<boolean> {
    const to = params.to.trim();
    if (!to) return false;

    const referentLine = params.referentName?.trim()
      ? `contactez votre référent (${params.referentName.trim()}) pour en recevoir un nouveau.`
      : 'contactez votre référent pour en recevoir un nouveau.';

    const firstName = params.firstName?.trim();
    const greetingLine = firstName ? `Bonjour ${firstName},` : 'Bonjour,';

    const vars = {
      greetingLine,
      activationLink: params.activationLink,
      validityLabel: params.validityLabel,
      referentLine,
    };
    const htmlInner = renderMailTemplateHtml(ACCOUNT_ACTIVATION_BODY, vars);
    const html = wrapZupdecoEmailHtml(htmlInner, '#f97316');

    if (!this.isMailEnabled()) {
      this.logger.warn(
        `Mail disabled or SendGrid not configured; activation email skipped for ${to}`,
      );
      return false;
    }

    const from = this.getFrom();
    await this.dispatch({ to, cc: [], replyTo: from.email, subject: ACCOUNT_ACTIVATION_SUBJECT, html });
    return true;
  }

  private async dispatch(opts: {
    to: string;
    cc: string[];
    replyTo: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.isMailEnabled()) {
      this.logger.debug(`Mail disabled or SendGrid not configured; skipped: ${opts.subject}`);
      return;
    }
    const from = this.getFrom();
    try {
      await sgMail.send({
        to: opts.to,
        cc: opts.cc.length ? opts.cc : undefined,
        replyTo: { email: opts.replyTo },
        subject: opts.subject,
        html: opts.html,
        from,
      });
    } catch (err: unknown) {
      const body =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'body' in err.response
          ? JSON.stringify((err as { response: { body: unknown } }).response.body)
          : '';
      this.logger.warn(
        `SendGrid send failed: ${err instanceof Error ? err.message : String(err)} ${body}`.trim(),
      );
    }
  }
}
