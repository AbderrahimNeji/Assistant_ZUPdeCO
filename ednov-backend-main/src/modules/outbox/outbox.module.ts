import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from './entities/outbox-event.entity';
import { ProcessedEvent } from './entities/processed-event.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { OutboxEventService } from './outbox-event.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent, ProcessedEvent, IdempotencyKey]),
  ],
  providers: [OutboxEventService],
  exports: [TypeOrmModule, OutboxEventService],
})
export class OutboxModule {}
