import { Entity, Column, ManyToOne, JoinColumn, Unique, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity({ name: 'feature_flags' })
@Unique(['companyId', 'key'])
export class FeatureFlag extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 100, name: 'key' })
  key: string;

  @Column({ type: 'boolean', name: 'enabled', default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', name: 'config', default: {} })
  config: Record<string, unknown>;
}
