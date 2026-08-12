import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export type ProfileCategory = 'admin' | 'volunteer' | 'student' | 'coordinator';
export type ProfileStatus = 'active' | 'inactive';

@Entity({ name: 'profiles' })
@Index(['companyId'])
export class Profile extends SoftDeleteBaseEntity {
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

  @Column({ type: 'varchar', length: 30, name: 'category' })
  category: ProfileCategory;

  @Column({ type: 'jsonb', name: 'config', default: {} })
  config: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: ProfileStatus;
}
