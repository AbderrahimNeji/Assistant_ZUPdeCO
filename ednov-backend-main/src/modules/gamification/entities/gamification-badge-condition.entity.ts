import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { GamificationBadge } from './gamification-badge.entity';

@Entity({ name: 'gamification_badge_conditions' })
@Index(['badgeId'])
export class GamificationBadgeCondition extends BaseEntity {
  @Column({ type: 'uuid', name: 'badge_id' })
  badgeId: string;

  @ManyToOne(() => GamificationBadge, (b) => b.conditions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_id' })
  badge: Relation<GamificationBadge>;

  @Column({ type: 'varchar', length: 100, name: 'type_condition' })
  typeCondition: string;

  @Column({ type: 'varchar', length: 10, name: 'operateur' })
  operateur: string;

  @Column({ type: 'int', name: 'valeur' })
  valeur: number;
}
