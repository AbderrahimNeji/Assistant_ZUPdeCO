import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { Session } from './session.entity';
import { User } from '../../users/entities/user.entity';

export type StatusTransitionTriggerType = 'manual' | 'attendance' | 'cr_validation';

@Entity({ name: 'session_status_history' })
@Index(['sessionId'])
export class SessionStatusHistory extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Relation<Session>;

  @Column({ type: 'varchar', length: 20, name: 'from_status' })
  fromStatus: string;

  @Column({ type: 'varchar', length: 20, name: 'to_status' })
  toStatus: string;

  @Column({ type: 'varchar', length: 30, name: 'trigger_type' })
  triggerType: StatusTransitionTriggerType;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 50, name: 'reason_code', nullable: true })
  reasonCode: string | null;

  @Column({ type: 'text', name: 'reason_detail', nullable: true })
  reasonDetail: string | null;

  @Column({ type: 'varchar', length: 20, name: 'dematch_mode', nullable: true })
  dematchMode: string | null;

  @Column({ type: 'int', name: 'removed_pairs_count', nullable: true })
  removedPairsCount: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: Relation<User> | null;
}
