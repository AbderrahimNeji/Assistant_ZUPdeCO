import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from './company.entity';

@Entity({ name: 'contact_functions' })
@Index(['companyId'])
@Index(['label'])
@Index(['isDefault'])
@Index(['companyId', 'label'], { unique: true, where: 'deleted_at IS NULL' })
export class ContactFunction extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 100, name: 'label' })
  label: string;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'int', name: 'usage_count', default: 0 })
  usageCount: number;
}
