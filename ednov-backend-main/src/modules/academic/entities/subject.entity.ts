import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export type SubjectStatus = 'active' | 'inactive';

@Entity({ name: 'subjects' })
@Index(['companyId'])
export class Subject extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 100, name: 'label' })
  label: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, name: 'education_cycle', nullable: true })
  educationCycle: string | null;

  @Column({ type: 'boolean', name: 'is_core', default: false })
  isCore: boolean;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: SubjectStatus;
}
