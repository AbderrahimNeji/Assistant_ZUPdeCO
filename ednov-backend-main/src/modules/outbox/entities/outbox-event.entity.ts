import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export type OutboxEventStatus = 'pending' | 'published' | 'failed';

@Entity({ name: 'outbox_events' })
@Index(['status', 'createdAt'], { where: "status = 'pending'" })
@Index(['companyId'])
export class OutboxEvent extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 100, name: 'aggregate_type' })
  aggregateType: string;

  @Column({ type: 'uuid', name: 'aggregate_id' })
  aggregateId: string;

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb', name: 'payload', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'pending' })
  status: OutboxEventStatus;
}
