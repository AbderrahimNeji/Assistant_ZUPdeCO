import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { GamificationBadge } from './gamification-badge.entity';

@Entity({ name: 'gamification_user_badges' })
@Index(['userId', 'badgeId'], { unique: true })
@Index(['userId'])
export class GamificationUserBadge extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'badge_id' })
  badgeId: string;

  @ManyToOne(() => GamificationBadge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_id' })
  badge: Relation<GamificationBadge>;
}
