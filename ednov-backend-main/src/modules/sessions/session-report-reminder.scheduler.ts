import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SessionReport } from './entities/session-report.entity';
import { SessionParticipant } from './entities/session-participant.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionalMailService } from '../mail/transactional-mail.service';

type Tier = {
  column: 'reminder24hSentAt' | 'reminder96hSentAt';
  dbColumn: 'reminder_24h_sent_at' | 'reminder_96h_sent_at';
  hours: number;
  type: 'SESSION_REPORT_REMINDER_24H' | 'SESSION_REPORT_REMINDER_96H';
  title: string;
};

const TIERS: Tier[] = [
  {
    column: 'reminder24hSentAt',
    dbColumn: 'reminder_24h_sent_at',
    hours: 24,
    type: 'SESSION_REPORT_REMINDER_24H',
    title: 'Compte rendu en attente depuis 24h',
  },
  {
    column: 'reminder96hSentAt',
    dbColumn: 'reminder_96h_sent_at',
    hours: 96,
    type: 'SESSION_REPORT_REMINDER_96H',
    title: 'Compte rendu en attente depuis 96h',
  },
];

/**
 * Hourly scheduler that scans session_reports in status `to_complete` and sends
 * 24h / 96h reminder notifications to session tutors/volunteers (`session_participants`).
 * If none match, falls back to the report author.
 *
 * Idempotence: each tier stamps its own `reminder_*_sent_at` column and the
 * notifications table has a unique dedupe key per recipient user, so duplicates are impossible
 * even on cron retries or multiple instances.
 *
 * Disable with env `SESSION_REPORT_REMINDER_JOB_ENABLED=false` or `0`.
 */
@Injectable()
export class SessionReportReminderScheduler {
  private readonly logger = new Logger(SessionReportReminderScheduler.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SessionReport)
    private readonly reportRepository: Repository<SessionReport>,
    @InjectRepository(SessionParticipant)
    private readonly participantRepository: Repository<SessionParticipant>,
    private readonly notifications: NotificationsService,
    private readonly transactionalMail: TransactionalMailService,
  ) {}

  @Cron('0 * * * *', {
    name: 'session-report-reminders',
    timeZone: 'Europe/Paris',
  })
  async handle(): Promise<void> {
    const raw = this.configService.get<string>('SESSION_REPORT_REMINDER_JOB_ENABLED');
    if (raw === 'false' || raw === '0') return;

    try {
      for (const tier of TIERS) {
        await this.runTier(tier);
      }
    } catch (err) {
      this.logger.error(
        `session-report-reminders failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /** Tutors and volunteers on the session (same convention as elsewhere in sessions). */
  private async reminderRecipientUserIds(sessionId: string): Promise<string[]> {
    const rows = await this.participantRepository.find({
      where: { sessionId, role: In(['tutor', 'volunteer']) },
      select: ['userId'],
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  private async runTier(tier: Tier): Promise<void> {
    const threshold = new Date(Date.now() - tier.hours * 3_600_000);

    const rows = await this.reportRepository
      .createQueryBuilder('r')
      .where(`r.status = 'to_complete'`)
      .andWhere('r.to_complete_since IS NOT NULL')
      .andWhere('r.to_complete_since <= :threshold', { threshold })
      .andWhere(`r.${tier.dbColumn} IS NULL`)
      .limit(500)
      .getMany();

    if (rows.length === 0) return;

    let sent = 0;
    const tierKind = tier.hours === 96 ? '96h' : '24h';
    for (const report of rows) {
      let recipientIds = await this.reminderRecipientUserIds(report.sessionId);
      if (recipientIds.length === 0) {
        recipientIds = [report.authorId];
      }

      try {
        for (const userId of recipientIds) {
          const created = await this.notifications.createIfNotDuplicate({
            companyId: report.companyId,
            userId,
            type: tier.type,
            title: tier.title,
            body: report.sessionDisplayName
              ? `Votre compte rendu (${report.sessionDisplayName}) reste à saisir.`
              : 'Un compte rendu reste à saisir.',
            payload: {
              sessionId: report.sessionId,
              reportId: report.id,
            },
            dedupeKey: `report:${report.id}:${tier.type}`,
          });
          if (created) {
            await this.transactionalMail
              .sendSessionReportReminder({
                reportId: report.id,
                tier: tierKind,
                recipientUserId: userId,
              })
              .catch((e) =>
                this.logger.warn(
                  `reminder mail failed report=${report.id} user=${userId}: ${(e as Error).message}`,
                ),
              );
            sent += 1;
          }
        }
      } finally {
        report[tier.column] = new Date();
        await this.reportRepository.save(report);
      }
    }

    this.logger.log(`${tier.type}: processed=${rows.length} sent=${sent}`);
  }
}
