import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Establishment } from '../../companies/entities/establishment.entity';
import { Room } from '../../companies/entities/room.entity';
import { Program } from '../../academic/entities/program.entity';
import { SchoolYear } from '../../academic/entities/school-year.entity';
import { User } from '../../users/entities/user.entity';
import { Activity } from '../../activity/entities/activity.entity';
import { SessionParticipant } from './session-participant.entity';
import { Assignment } from './assignment.entity';
import { SessionReport } from './session-report.entity';
import { SessionStatusHistory } from './session-status-history.entity';
import { SessionStudentTutorPair } from './session-student-tutor-pair.entity';
import { VscReport } from './vsc-report.entity';
import { SessionType } from '../session-types.constants';

export type { SessionType } from '../session-types.constants';
export type SessionFormat = 'in_person' | 'remote' | 'hybrid';
export type SessionMode = 'single' | 'recurring';
export type RecurrenceType =
  | 'none'
  | 'once'
  | 'daily'
  | 'weekly'
  | 'several_days_per_week'
  | 'biweekly'
  | 'monthly'
  | 'ab'
  | 'custom';
/** Session lifecycle status. Default on creation is PLANNED. */
export enum SessionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'sessions' })
@Index(['companyId'])
@Index(['companyId', 'createdAt'])
@Index(['companyId', 'status'])
@Index(['establishmentId', 'sessionDate'])
@Index(['companyId', 'schoolYearId'])
export class Session extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'establishment_id' })
  establishmentId: string;

  @ManyToOne(() => Establishment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment>;

  @Column({ type: 'uuid', name: 'room_id', nullable: true })
  roomId: string | null;

  @ManyToOne(() => Room, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'room_id' })
  room: Relation<Room> | null;

  @Column({ type: 'uuid', name: 'program_id', nullable: true })
  programId: string | null;

  @ManyToOne(() => Program, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'program_id' })
  program: Relation<Program> | null;

  @Column({ type: 'uuid', name: 'school_year_id' })
  schoolYearId: string;

  @ManyToOne(() => SchoolYear, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'school_year_id' })
  schoolYear: Relation<SchoolYear>;

  @Column({ type: 'jsonb', name: 'level_ids', default: [] })
  levelIds: string[];

  @Column({ type: 'jsonb', name: 'level_names', default: [] })
  levelNames: string[];

  @Column({ type: 'date', name: 'session_date' })
  sessionDate: Date;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  @Column({ type: 'varchar', length: 50, name: 'type' })
  type: SessionType;

  @Column({ type: 'varchar', length: 20, name: 'session_format', default: 'in_person' })
  sessionFormat: SessionFormat;

  @Column({ type: 'text', name: 'join_link', nullable: true })
  joinLink: string | null;

  @Column({ type: 'varchar', length: 20, name: 'mode', default: 'single' })
  mode: SessionMode;

  @Column({ type: 'varchar', length: 50, name: 'recurrence_type', default: 'none' })
  recurrenceType: RecurrenceType;

  @Column({ type: 'jsonb', name: 'recurrence_rule', nullable: true })
  recurrenceRule: Record<string, unknown> | null;

  @Column({ type: 'int', name: 'max_students', nullable: true })
  maxStudents: number | null;

  @Column({ type: 'int', name: 'max_volunteers', nullable: true })
  maxVolunteers: number | null;

  @Column({ type: 'uuid', name: 'activity_id', nullable: true })
  activityId: string | null;

  @ManyToOne(() => Activity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity | null;

  @Column({ type: 'jsonb', name: 'subject_ids', default: [] })
  subjectIds: string[];

  @Column({ type: 'jsonb', name: 'subject_names', default: [] })
  subjectNames: string[];

  @Column({ type: 'uuid', name: 'class_id', nullable: true })
  classId: string | null;

  @Column({ type: 'jsonb', name: 'specialty_ids', nullable: true, default: null })
  specialtyIds: string[] | null;

  @Column({ type: 'varchar', length: 255, name: 'establishment_name', nullable: true })
  establishmentName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'program_name', nullable: true })
  programName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'activity_name', nullable: true })
  activityName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'room_name', nullable: true })
  roomName: string | null;

  @Column({ type: 'text', name: 'topic', nullable: true })
  topic: string | null;

  @Column({ type: 'int', name: 'duration_minutes', nullable: true })
  durationMinutes: number | null;

  /** If false, session dates must not fall on company holiday/vacation periods in `holidays`. Default true. */
  @Column({ type: 'boolean', name: 'plan_during_holidays', default: true })
  planDuringHolidays: boolean;

  @Column({ type: 'uuid', name: 'recurrence_group_id', nullable: true })
  recurrenceGroupId: string | null;

  @Column({ type: 'text', name: 'internal_notes', nullable: true })
  internalNotes: string | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: SessionStatus.PLANNED })
  status: SessionStatus;

  @Column({ type: 'uuid', name: 'managed_by', nullable: true })
  managedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'managed_by' })
  managedBy: Relation<User> | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: Relation<User> | null;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Relation<User> | null;

  @Column({ type: 'int', name: 'version', default: 1 })
  version: number;

  @OneToMany(() => SessionParticipant, (sp) => sp.session)
  sessionParticipants: Relation<SessionParticipant>[];

  @OneToMany(() => Assignment, (a) => a.session)
  assignments: Relation<Assignment>[];

  @OneToMany(() => SessionReport, (sr) => sr.session)
  sessionReports: Relation<SessionReport>[];

  @OneToMany(() => SessionStatusHistory, (h) => h.session)
  statusHistory: Relation<SessionStatusHistory>[];

  @OneToMany(() => SessionStudentTutorPair, (p) => p.session)
  studentTutorPairs: Relation<SessionStudentTutorPair>[];

  @OneToMany(() => VscReport, (vr) => vr.session)
  vscReports: Relation<VscReport>[];
}
