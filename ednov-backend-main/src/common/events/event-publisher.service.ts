import { Injectable, Logger } from '@nestjs/common';

/**
 * No-op event publisher for monolith: no RabbitMQ/PubSub.
 * Override or replace with a real implementation if you need async events later.
 */
@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  async publish(_topic: string, _payload: Record<string, unknown>): Promise<void> {
    console.log(`Event (no-op): ${_topic}`);
  }
}
