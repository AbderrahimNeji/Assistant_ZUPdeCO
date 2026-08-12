import { Entity, Column, Index, ManyToOne, JoinColumn, Relation, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Establishment } from '../../companies/entities/establishment.entity';
import { User } from '../../users/entities/user.entity';
import { Session } from './session.entity';

export type VscDailyReportStatus = 'to_fill' | 'submitted' | 'validated';

@Entity({ name: 'vsc_daily_reports' })
@Unique('uq_vsc_daily_reports_scope', ['companyId', 'establishmentId', 'reportDate', 'vscUserId'])
@Index(['establishmentId', 'reportDate'])
@Index(['vscUserId', 'reportDate'])
export class VscDailyReport extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'establishment_id' })
  establishmentId: string;

  @ManyToOne(() => Establishment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment>;

  @Column({ type: 'date', name: 'report_date' })
  reportDate: string;

  @Column({ type: 'uuid', name: 'vsc_user_id' })
  vscUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vsc_user_id' })
  vscUser: Relation<User>;

  @Column({ type: 'smallint', name: 'rating', nullable: true })
  rating: number | null;

  @Column({ type: 'text', name: 'comment', nullable: true })
  comment: string | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'to_fill' })
  status: VscDailyReportStatus;

  @Column({ type: 'timestamptz', name: 'visible_at' })
  visibleAt: Date;

  @Column({ type: 'timestamptz', name: 'availability_notified_at', nullable: true })
  availabilityNotifiedAt: Date | null;

  @Column({ type: 'uuid', name: 'unlock_session_id', nullable: true })
  unlockSessionId: string | null;

  @ManyToOne(() => Session, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unlock_session_id' })
  unlockSession: Relation<Session> | null;

  @Column({ type: 'timestamptz', name: 'generated_at', default: () => 'CURRENT_TIMESTAMP' })
  generatedAt: Date;

  @Column({ type: 'timestamptz', name: 'submitted_at', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'uuid', name: 'validated_by', nullable: true })
  validatedBy: string | null;

  @Column({ type: 'timestamptz', name: 'validated_at', nullable: true })
  validatedAt: Date | null;
}
