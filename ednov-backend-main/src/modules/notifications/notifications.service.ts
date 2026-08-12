import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationsEventsService } from './notifications-events.service';

export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
  /**
   * Optional stable key. Combined with (userId, type) it forms a unique constraint
   * so the same notification cannot be emitted twice (e.g. retries, double crons).
   */
  dedupeKey?: string;
}

export interface ListNotificationsOptions {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly events: NotificationsEventsService,
  ) {}

  /**
   * Create a notification. If `dedupeKey` is set and a matching row already exists
   * for (userId, type, dedupeKey), returns `null` and does not emit an event.
   */
  async createIfNotDuplicate(input: CreateNotificationInput): Promise<Notification | null> {
    if (input.dedupeKey) {
      const existing = await this.repo.findOne({
        where: {
          userId: input.userId,
          type: input.type,
          dedupeKey: input.dedupeKey,
        },
      });
      if (existing) return null;
    }

    const row = this.repo.create({
      companyId: input.companyId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      payload: input.payload ?? null,
      dedupeKey: input.dedupeKey ?? null,
    });

    try {
      const saved = await this.repo.save(row);
      this.events.publishCreated(saved);
      return saved;
    } catch (err) {
      // If the partial unique index raced, just treat as duplicate.
      const code = (err as { code?: string }).code;
      if (code === '23505') {
        this.logger.debug(
          `Duplicate notification suppressed by unique index (user=${input.userId}, type=${input.type}, key=${input.dedupeKey ?? ''})`,
        );
        return null;
      }
      throw err;
    }
  }

  async list(
    userId: string,
    opts: ListNotificationsOptions = {},
  ): Promise<{ items: Notification[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (opts.unreadOnly) qb.andWhere('n.read_at IS NULL');
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const n = await this.repo.findOne({ where: { id, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    if (!n.readAt) {
      n.readAt = new Date();
      await this.repo.save(n);
      this.events.publishRead(userId, id);
    }
    return n;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, readAt: IsNull() }, { readAt: new Date() });
    this.events.publishReadAll(userId);
  }
}
