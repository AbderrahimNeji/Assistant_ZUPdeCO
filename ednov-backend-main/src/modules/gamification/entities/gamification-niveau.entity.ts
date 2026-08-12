import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity({ name: 'gamification_niveaux' })
@Index(['companyId'])
@Index(['companyId', 'numero'], { unique: true })
export class GamificationNiveau extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'int', name: 'numero' })
  numero: number;

  @Column({ type: 'text', name: 'nom' })
  nom: string;

  @Column({ type: 'int', name: 'xp_requis' })
  xpRequis: number;

  @Column({ type: 'text', name: 'icone', nullable: true })
  icone: string | null;

  @Column({ type: 'text', name: 'couleur', nullable: true })
  couleur: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;
}
