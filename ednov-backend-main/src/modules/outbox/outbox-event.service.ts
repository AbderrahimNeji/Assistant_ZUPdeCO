import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';

export interface OutboxEventPayload {
  companyId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class OutboxEventService {
  private readonly logger = new Logger(OutboxEventService.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
  ) {}

  /**
   * Persist an outbox event. Pass an EntityManager to run inside an existing transaction.
   */
  async publish(data: OutboxEventPayload, manager?: EntityManager): Promise<OutboxEvent> {
    const repo = manager
      ? manager.getRepository(OutboxEvent)
      : this.outboxRepository;

    const event = repo.create({
      companyId: data.companyId,
      aggregateType: data.aggregateType,
      aggregateId: data.aggregateId,
      eventType: data.eventType,
      payload: data.payload,
      status: 'pending' as OutboxEventStatus,
    });

    const saved = await repo.save(event);
    console.log(`Outbox event persisted: ${saved.eventType} [${saved.id}]`);
    return saved;
  }

  async markPublished(id: string): Promise<void> {
    await this.outboxRepository.update(id, { status: 'published' as OutboxEventStatus });
  }

  async markFailed(id: string): Promise<void> {
    await this.outboxRepository.update(id, { status: 'failed' as OutboxEventStatus });
  }

  async findPending(): Promise<OutboxEvent[]> {
    return this.outboxRepository.find({
      where: { status: 'pending' as OutboxEventStatus },
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }
}
