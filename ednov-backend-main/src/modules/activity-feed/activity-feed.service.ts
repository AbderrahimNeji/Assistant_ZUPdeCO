import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../sessions/entities/session.entity';
import { SessionParticipant } from '../sessions/entities/session-participant.entity';
import { SessionReport } from '../sessions/entities/session-report.entity';
import { SessionStatus } from '../sessions/entities/session.entity';
import { GamificationUserBadge } from '../gamification/entities/gamification-user-badge.entity';
import { toLocalDateString } from '../../common/utils/date-parser.utils';

export type ActivityFeedItemType = 'session_completed' | 'cr_submitted' | 'badge_awarded';

export interface SessionCompletedPayload {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  establishmentName?: string | null;
}

export interface CrSubmittedPayload {
  reportId: string;
  sessionId: string;
  sessionDate?: string | null;
}

export interface BadgeAwardedPayload {
  badgeId: string;
  badgeNom: string;
  badgeIcone?: string | null;
  badgeCouleur?: string | null;
}

export interface ActivityFeedItem {
  id: string;
  type: ActivityFeedItemType;
  date: string;
  payload: SessionCompletedPayload | CrSubmittedPayload | BadgeAwardedPayload;
}

@Injectable()
export class ActivityFeedService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(SessionParticipant)
    private readonly participantRepo: Repository<SessionParticipant>,
    @InjectRepository(SessionReport)
    private readonly sessionReportRepo: Repository<SessionReport>,
    @InjectRepository(GamificationUserBadge)
    private readonly userBadgeRepo: Repository<GamificationUserBadge>,
  ) {}

  async getActivityFeedForTutor(
    userId: string,
    companyId: string,
    limit = 50,
  ): Promise<ActivityFeedItem[]> {
    if (!userId?.trim() || !companyId?.trim()) {
      throw new BadRequestException('User id and company id are required');
    }
    const takePerType = Math.min(Math.max(1, limit), 100);
    const sessionEvents: { date: Date; item: ActivityFeedItem }[] = [];
    const crEvents: { date: Date; item: ActivityFeedItem }[] = [];
    const badgeEvents: { date: Date; item: ActivityFeedItem }[] = [];

    const participantSessionIds = await this.participantRepo
      .createQueryBuilder('p')
      .select('p.sessionId', 'sessionId')
      .where('p.userId = :userId', { userId })
      .andWhere("p.role = 'tutor'")
      .getRawMany();
    const ids = (participantSessionIds as { sessionId: string }[]).map((r) => r.sessionId).filter(Boolean);

    const sessionQb = this.sessionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.establishment', 'e')
      .where('s.companyId = :companyId', { companyId })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [SessionStatus.COMPLETED, SessionStatus.CLOSED],
      })
      .andWhere(
        '(s.managedById = :userId OR s.id IN (:...ids))',
        { userId, ids: ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'] },
      )
      .orderBy('s.sessionDate', 'DESC')
      .addOrderBy('s.startTime', 'DESC')
      .take(takePerType);

    const sessions = await sessionQb.getMany();
    for (const s of sessions) {
      const dateOnly =
        s.sessionDate instanceof Date
          ? toLocalDateString(s.sessionDate)
          : String(s.sessionDate).slice(0, 10);
      const timeStr = String(s.startTime ?? '').trim();
      const date = timeStr ? new Date(`${dateOnly}T${timeStr}`) : new Date(dateOnly);
      sessionEvents.push({
        date,
        item: {
          id: `session-${s.id}`,
          type: 'session_completed',
          date: date.toISOString(),
          payload: {
            sessionId: s.id,
            sessionDate: String(s.sessionDate),
            startTime: String(s.startTime),
            establishmentName: s.establishment?.name ?? null,
          },
        },
      });
    }

    const reports = await this.sessionReportRepo.find({
      where: { companyId, authorId: userId, status: 'submitted' },
      relations: ['session'],
      order: { updatedAt: 'DESC' },
      take: takePerType,
    });
    for (const r of reports) {
      const date = new Date(r.updatedAt);
      crEvents.push({
        date,
        item: {
          id: `cr-${r.id}`,
          type: 'cr_submitted',
          date: date.toISOString(),
          payload: {
            reportId: r.id,
            sessionId: r.sessionId,
            sessionDate: r.session?.sessionDate == null ? null : String(r.session.sessionDate),
          },
        },
      });
    }

    const badges = await this.userBadgeRepo.find({
      where: { userId },
      relations: ['badge'],
      order: { createdAt: 'DESC' },
      take: takePerType,
    });
    for (const ub of badges) {
      if (!ub.badge) continue;
      const date = new Date(ub.createdAt);
      badgeEvents.push({
        date,
        item: {
          id: `badge-${ub.id}`,
          type: 'badge_awarded',
          date: date.toISOString(),
          payload: {
            badgeId: ub.badge.id,
            badgeNom: ub.badge.nom,
            badgeIcone: ub.badge.icone ?? null,
            badgeCouleur: ub.badge.couleur ?? null,
          },
        },
      });
    }

    const merged = [...sessionEvents, ...crEvents, ...badgeEvents].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
    return merged.slice(0, takePerType).map((x) => x.item);
  }
}
