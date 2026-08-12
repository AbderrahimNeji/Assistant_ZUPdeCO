import { Entity, Column, OneToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export type MatchingStrategy = 'manual' | 'automatic' | 'hybrid';

@Entity({ name: 'session_configs' })
export class SessionConfig extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id', unique: true })
  companyId: string;

  @OneToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'int', name: 'default_duration_minutes', nullable: true })
  defaultDurationMinutes: number | null;

  @Column({ type: 'int', name: 'max_students_per_session', nullable: true })
  maxStudentsPerSession: number | null;

  @Column({ type: 'int', name: 'max_volunteers_per_session', nullable: true })
  maxVolunteersPerSession: number | null;

  @Column({ type: 'boolean', name: 'allow_recurring', default: true })
  allowRecurring: boolean;

  @Column({ type: 'boolean', name: 'allow_ab_calendar', default: false })
  allowAbCalendar: boolean;

  @Column({ type: 'boolean', name: 'allow_overbooking', default: false })
  allowOverbooking: boolean;

  @Column({ type: 'int', name: 'report_deadline_hours', nullable: true })
  reportDeadlineHours: number | null;

  @Column({ type: 'int', name: 'auto_close_after_days', nullable: true })
  autoCloseAfterDays: number | null;

  @Column({ type: 'varchar', length: 20, name: 'matching_strategy', default: 'manual' })
  matchingStrategy: MatchingStrategy;

  @Column({ type: 'jsonb', name: 'settings', default: {} })
  settings: Record<string, unknown>;
}
