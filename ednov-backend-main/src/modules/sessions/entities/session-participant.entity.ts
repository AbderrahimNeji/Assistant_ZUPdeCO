import { Entity, Column, ManyToOne, JoinColumn, Unique, Index, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { Session } from './session.entity';
import { User } from '../../users/entities/user.entity';

export type ParticipantRole = 'tutor' | 'volunteer' | 'student';
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'pending';

@Entity({ name: 'session_participants' })
@Unique(['sessionId', 'userId'])
@Index(['sessionId'])
@Index(['userId'])
export class SessionParticipant extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => Session, (s) => s.sessionParticipants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Relation<Session>;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'varchar', length: 20, name: 'role' })
  role: ParticipantRole;

  @Column({ type: 'varchar', length: 20, name: 'attendance_status', default: 'pending' })
  attendanceStatus: AttendanceStatus;

  @Column({ type: 'text', name: 'absence_justification', nullable: true })
  absenceJustification: string | null;

  @Column({ type: 'text', name: 'absence_comment', nullable: true })
  absenceComment: string | null;

  @Column({ type: 'timestamptz', name: 'matched_at', nullable: true })
  matchedAt: Date | null;

  @Column({ type: 'text', name: 'notes', nullable: true })
  notes: string | null;
}
