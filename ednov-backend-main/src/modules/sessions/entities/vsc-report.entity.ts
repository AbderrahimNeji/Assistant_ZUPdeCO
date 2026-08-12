import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Establishment } from '../../companies/entities/establishment.entity';
import { Session } from './session.entity';
import { User } from '../../users/entities/user.entity';

export type VscReportStatus = 'draft' | 'submitted' | 'validated';
export type VscReportCategory = 'daily' | 'weekly';

@Entity({ name: 'vsc_reports' })
@Index(['companyId'])
@Index(['sessionId'])
@Index(['vscId'])
@Index(['establishmentId'])
@Index(['category'])
@Index(['periodStart', 'periodEnd'])
export class VscReport extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'session_id', nullable: true })
  sessionId: string | null;

  @ManyToOne(() => Session, (s) => s.vscReports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Relation<Session> | null;

  @Column({ type: 'uuid', name: 'student_id', nullable: true })
  studentId: string | null;

  @Column({ type: 'uuid', name: 'volunteer_id', nullable: true })
  volunteerId: string | null;

  @Column({ type: 'uuid', name: 'vsc_id', nullable: true })
  vscId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vsc_id' })
  vsc: Relation<User> | null;

  @Column({ type: 'uuid', name: 'establishment_id', nullable: true })
  establishmentId: string | null;

  @ManyToOne(() => Establishment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment> | null;

  @Column({ type: 'varchar', length: 20, name: 'category', nullable: true })
  category: VscReportCategory | null;

  @Column({ type: 'timestamptz', name: 'period_start', nullable: true })
  periodStart: Date | null;

  @Column({ type: 'timestamptz', name: 'period_end', nullable: true })
  periodEnd: Date | null;

  @Column({ type: 'text', name: 'summary', nullable: true })
  summary: string | null;

  @Column({ type: 'text', name: 'progress_evaluation', nullable: true })
  progressEvaluation: string | null;

  @Column({ type: 'text', name: 'recommendations', nullable: true })
  recommendations: string | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'draft' })
  status: VscReportStatus;

  // POC-323: Champs de validation
  @Column({ type: 'uuid', name: 'validated_by', nullable: true })
  validatedBy: string | null;

  @Column({ type: 'timestamptz', name: 'validated_at', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'int', name: 'sessions_completed', default: 0 })
  sessionsCompleted: number;

  @Column({ type: 'int', name: 'sessions_closed', default: 0 })
  sessionsClosed: number;

  @Column({ type: 'int', name: 'sessions_cancelled', default: 0 })
  sessionsCancelled: number;

  @Column({ type: 'int', name: 'assignments_created', default: 0 })
  assignmentsCreated: number;

  @Column({ type: 'int', name: 'reports_submitted', default: 0 })
  reportsSubmitted: number;

  @Column({ type: 'int', name: 'reports_pending', default: 0 })
  reportsPending: number;

  @Column({ type: 'int', name: 'reports_validated', default: 0 })
  reportsValidated: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'tutor_hours', default: 0 })
  tutorHours: number;

  @Column({ type: 'varchar', length: 255, name: 'student_name', nullable: true })
  studentName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'volunteer_name', nullable: true })
  volunteerName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'session_display_name', nullable: true })
  sessionDisplayName: string | null;
}
