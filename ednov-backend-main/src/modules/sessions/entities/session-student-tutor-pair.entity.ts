import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { Session, type SessionType } from './session.entity';
import { User } from '../../users/entities/user.entity';

export type AssignmentSource =
  | 'manual'
  | 'auto_binome_coeur'
  | 'auto_history'
  | 'auto_balanced';

/**
 * Uniqueness rules (partial indexes, migration 1803800000000):
 * - session_type <> 'whole_class' → one tutor per student per session
 * - session_type = 'whole_class' → unique (session, student, tutor); multiple tutors per student allowed
 */
@Entity({ name: 'session_student_tutor_pairs' })
@Index(['sessionId'])
@Index(['tutorUserId'])
@Index(['sessionType'])
export class SessionStudentTutorPair extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Relation<Session>;

  @Column({ type: 'varchar', length: 30, name: 'session_type' })
  sessionType: SessionType;

  @Column({ type: 'uuid', name: 'student_user_id' })
  studentUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_user_id' })
  studentUser: Relation<User>;

  @Column({ type: 'uuid', name: 'tutor_user_id' })
  tutorUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorUser: Relation<User>;

  @Column({ type: 'varchar', length: 30, name: 'assignment_source' })
  assignmentSource: AssignmentSource;
}
