import { Entity, Column, ManyToOne, JoinColumn, Index, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'branding_histories' })
@Index(['companyId'])
export class BrandingHistory extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'jsonb', name: 'old_config' })
  oldConfig: Record<string, unknown>;

  @Column({ type: 'uuid', name: 'changed_by', nullable: true })
  changedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by' })
  changedBy: Relation<User> | null;

  @Column({ type: 'timestamptz', name: 'changed_at', default: () => 'CURRENT_TIMESTAMP' })
  changedAt: Date;
}
