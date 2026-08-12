import { Entity, Column, PrimaryColumn, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity({ name: 'idempotency_keys' })
@Index(['companyId', 'createdAt'])
export class IdempotencyKey {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'key' })
  key: string;

  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'smallint', name: 'response_status', nullable: true })
  responseStatus: number | null;

  @Column({ type: 'varchar', length: 64, name: 'response_body_hash', nullable: true })
  responseBodyHash: string | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
