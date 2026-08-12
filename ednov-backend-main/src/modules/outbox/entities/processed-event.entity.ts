import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'processed_events' })
export class ProcessedEvent {
  @PrimaryColumn({ type: 'varchar', length: 100, name: 'consumer_id' })
  consumerId: string;

  @PrimaryColumn({ type: 'uuid', name: 'event_id' })
  eventId: string;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
