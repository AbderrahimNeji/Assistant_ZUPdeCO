import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'student_status_history' })
@Index(['studentUserId', 'createdAt'])
export class StudentStatusHistory extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'student_user_id' })
  studentUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_user_id' })
  studentUser: Relation<User>;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Relation<User> | null;

  @Column({ type: 'varchar', length: 50, name: 'old_status', nullable: true })
  oldStatus: string | null;

  @Column({ type: 'varchar', length: 50, name: 'new_status' })
  newStatus: string;

  @Column({ type: 'varchar', length: 200, name: 'reason', nullable: true })
  reason: string | null;

  /** Précision libre lorsque reason = 'Autre'. */
  @Column({ type: 'varchar', length: 200, name: 'reason_note', nullable: true })
  reasonNote: string | null;
}
