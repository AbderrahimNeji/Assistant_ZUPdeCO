import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { ActivityType } from './activity-type.entity';

export type ActivityStatus = 'active' | 'inactive';

@Entity({ name: 'activities' })
@Index(['companyId'])
@Index(['activityTypeId'])
@Index(['companyId', 'code'], { unique: true, where: 'deleted_at IS NULL' })
export class Activity extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'uuid', name: 'activity_type_id' })
  activityTypeId: string;

  @ManyToOne(() => ActivityType, (at) => at.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_type_id' })
  activityType: ActivityType;

  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'label' })
  label: string;

  @Column({ type: 'varchar', length: 255, name: 'activity_type_name', nullable: true })
  activityTypeName: string | null;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', name: 'can_has_cr', default: false })
  canHasCr: boolean;

  @Column({ type: 'boolean', name: 'bot', default: false })
  bot: boolean;

  @Column({ type: 'boolean', name: 'with_link', default: false })
  withLink: boolean;

  @Column({ type: 'boolean', name: 'chat', default: false })
  chat: boolean;

  @Column({ type: 'int', name: 'max_tutors', nullable: true })
  maxTutors: number | null;

  @Column({ type: 'int', name: 'max_students', nullable: true })
  maxStudents: number | null;

  @Column({ type: 'int', name: 'max_volunteers', nullable: true })
  maxVolunteers: number | null;

  @Column({ type: 'int', name: 'max_students_per_tutor', nullable: true })
  maxStudentsPerTutor: number | null;

  @Column({ type: 'int', name: 'order_index', nullable: true })
  orderIndex?: number | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: ActivityStatus;
}
