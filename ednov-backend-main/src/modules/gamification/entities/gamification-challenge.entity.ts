import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { GamificationBadge } from './gamification-badge.entity';
import { GamificationChallengeProgress } from './gamification-challenge-progress.entity';

export type ChallengeType = 'one_shot' | 'recurring';

@Entity({ name: 'gamification_challenges' })
@Index(['companyId'])
@Index(['companyId', 'code'])
export class GamificationChallenge extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 100, name: 'code' })
  code: string;

  @Column({ type: 'text', name: 'label' })
  label: string;

  @Column({ type: 'varchar', length: 20, name: 'type', default: 'one_shot' })
  type: ChallengeType;

  @Column({ type: 'int', name: 'target_value' })
  targetValue: number;

  @Column({ type: 'varchar', length: 50, name: 'unit', nullable: true })
  unit: string | null;

  @Column({ type: 'timestamptz', name: 'start_at', nullable: true })
  startAt: Date | null;

  @Column({ type: 'timestamptz', name: 'end_at', nullable: true })
  endAt: Date | null;

  @Column({ type: 'int', name: 'xp_reward', default: 0 })
  xpReward: number;

  @Column({ type: 'uuid', name: 'badge_id', nullable: true })
  badgeId: string | null;

  @ManyToOne(() => GamificationBadge, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'badge_id' })
  badge: Relation<GamificationBadge> | null;

  @OneToMany(() => GamificationChallengeProgress, (p) => p.challenge)
  progress: Relation<GamificationChallengeProgress>[];
}
