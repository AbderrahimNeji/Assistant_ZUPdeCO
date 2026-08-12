import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export type EducationCycle = 'primary' | 'middle' | 'high';
export type LevelStatus = 'active' | 'inactive';

@Entity({ name: 'levels' })
@Index(['companyId'])
export class Level extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 100, name: 'label' })
  label: string;

  @Column({ type: 'varchar', length: 20, name: 'education_cycle', nullable: true })
  educationCycle: EducationCycle | null;

  @Column({ type: 'int', name: 'min_age', nullable: true })
  minAge: number | null;

  @Column({ type: 'int', name: 'max_age', nullable: true })
  maxAge: number | null;

  @Column({ type: 'int', name: 'order_index', nullable: true })
  orderIndex?: number | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: LevelStatus;
}
