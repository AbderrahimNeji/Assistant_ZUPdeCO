import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Activity } from './activity.entity';

export type ActivityTypeStatus = 'active' | 'inactive';

@Entity({ name: 'activity_types' })
@Index(['companyId'])
@Index(['companyId', 'code'], { unique: true, where: 'deleted_at IS NULL' })
export class ActivityType extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'label' })
  label: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'int', name: 'order_index', nullable: true })
  orderIndex?: number | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: ActivityTypeStatus;

  @OneToMany(() => Activity, (a) => a.activityType)
  activities: Activity[];
}
