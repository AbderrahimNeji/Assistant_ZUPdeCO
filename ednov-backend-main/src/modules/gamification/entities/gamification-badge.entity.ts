import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { GamificationBadgeCondition } from './gamification-badge-condition.entity';

@Entity({ name: 'gamification_badges' })
@Index(['companyId'])
@Index(['companyId', 'code'], { unique: true })
export class GamificationBadge extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 100, name: 'code' })
  code: string;

  @Column({ type: 'text', name: 'nom' })
  nom: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, name: 'categorie', nullable: true })
  categorie: string | null;

  @Column({ type: 'text', name: 'icone', nullable: true })
  icone: string | null;

  @Column({ type: 'text', name: 'couleur', nullable: true })
  couleur: string | null;

  @Column({ type: 'int', name: 'xp_recompense', default: 0 })
  xpRecompense: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => GamificationBadgeCondition, (c) => c.badge)
  conditions: Relation<GamificationBadgeCondition>[];
}
