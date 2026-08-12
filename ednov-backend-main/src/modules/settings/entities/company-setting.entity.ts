import { Entity, Column, ManyToOne, JoinColumn, Unique, Index, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity({ name: 'company_settings' })
@Unique(['companyId', 'key'])
@Index(['companyId'])
export class CompanySetting extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 100, name: 'key' })
  key: string;

  @Column({ type: 'jsonb', name: 'value', default: {} })
  value: Record<string, unknown>;
}
