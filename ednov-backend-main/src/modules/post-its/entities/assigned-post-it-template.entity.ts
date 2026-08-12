import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { PostItThematic, PostItColor } from './post-it.entity';
import { ScheduleConfig } from '../schedule-config.types';

export type AssignedPostItRecurrence = 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'specific_date';

@Entity({ name: 'assigned_post_it_templates' })
@Index(['companyId', 'isActive'])
@Index(['companyId'])
export class AssignedPostItTemplate extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ type: 'varchar', length: 255, name: 'title' })
  title: string;

  @Column({ type: 'varchar', length: 50, name: 'thematic' })
  thematic: PostItThematic;

  @Column({ type: 'text', name: 'content' })
  content: string;

  @Column({ type: 'varchar', length: 20, name: 'color', default: 'jaune' })
  color: PostItColor;

  @Column({ type: 'boolean', name: 'is_priority', default: false })
  isPriority: boolean;

  @Column({ type: 'uuid', array: true, name: 'target_role_ids', default: [] })
  targetRoleIds: string[];

  @Column({ type: 'varchar', length: 50, name: 'target_role_code', nullable: true })
  targetRoleCode: string | null;

  @Column({ type: 'uuid', name: 'target_user_id', nullable: true })
  targetUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: User | null;

  @Column({ type: 'varchar', length: 20, name: 'recurrence_type', nullable: true })
  recurrenceType: AssignedPostItRecurrence | null;

  @Column({ type: 'int', array: true, name: 'quarterly_periods', nullable: true, default: [] })
  quarterlyPeriods: number[] | null;

  @Column({ type: 'timestamptz', name: 'specific_date_from', nullable: true })
  specificDateFrom: Date | null;

  @Column({ type: 'timestamptz', name: 'specific_date_to', nullable: true })
  specificDateTo: Date | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', name: 'last_provisioned_at', nullable: true })
  lastProvisionedAt: Date | null;

  @Column({ type: 'jsonb', name: 'schedule_config', nullable: true })
  scheduleConfig: ScheduleConfig | null;
}
