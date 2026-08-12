import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { GamificationChallenge } from './gamification-challenge.entity';

@Entity({ name: 'gamification_challenge_progress' })
@Index(['userId', 'challengeId'], { unique: true })
@Index(['userId'])
@Index(['challengeId'])
export class GamificationChallengeProgress extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'challenge_id' })
  challengeId: string;

  @ManyToOne(() => GamificationChallenge, (c) => c.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Relation<GamificationChallenge>;

  @Column({ type: 'int', name: 'current_value', default: 0 })
  currentValue: number;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;
}
