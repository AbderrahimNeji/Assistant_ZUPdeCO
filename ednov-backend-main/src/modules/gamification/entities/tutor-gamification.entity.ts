import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';
import { GamificationNiveau } from './gamification-niveau.entity';

@Entity({ name: 'tutor_gamification' })
@Index(['userId'], { unique: true })
@Index(['companyId'])
@Index(['companyId', 'totalXp'])
export class TutorGamification extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'int', name: 'total_xp', default: 0 })
  totalXp: number;

  @Column({ type: 'uuid', name: 'current_niveau_id', nullable: true })
  currentNiveauId: string | null;

  @ManyToOne(() => GamificationNiveau, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_niveau_id' })
  currentNiveau: Relation<GamificationNiveau> | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'attendance_score', nullable: true })
  attendanceScore: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'pedagogical_quality_score', nullable: true })
  pedagogicalQualityScore: string | null;
}
