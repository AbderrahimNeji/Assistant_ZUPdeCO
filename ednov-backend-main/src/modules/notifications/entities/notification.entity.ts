import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

export type NotificationType =
  | 'SESSION_REPORT_REMINDER_24H'
  | 'SESSION_REPORT_REMINDER_96H'
  | 'VSC_DAILY_REPORT_AVAILABLE'
  | 'SESSION_REPORT_VALIDATED_TUTOR';

@Entity({ name: 'notifications' })
@Index(['userId', 'createdAt'])
export class Notification extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'varchar', length: 64, name: 'type' })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255, name: 'title' })
  title: string;

  @Column({ type: 'text', name: 'body', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', name: 'payload', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 255, name: 'dedupe_key', nullable: true })
  dedupeKey: string | null;

  @Column({ type: 'timestamptz', name: 'read_at', nullable: true })
  readAt: Date | null;
}
