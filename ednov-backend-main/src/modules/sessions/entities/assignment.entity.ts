import { Entity, Column, Index, ManyToOne, JoinColumn, Unique, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Session } from './session.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'assignments' })
@Unique(['companyId', 'sessionId'])
@Index(['companyId'])
@Index(['companyId', 'volunteerUserId'])
export class Assignment extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => Session, (s) => s.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Relation<Session>;

  @Column({ type: 'uuid', name: 'volunteer_user_id' })
  volunteerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'volunteer_user_id' })
  volunteerUser: Relation<User>;

  @Column({ type: 'timestamptz', name: 'assigned_at', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;
}
