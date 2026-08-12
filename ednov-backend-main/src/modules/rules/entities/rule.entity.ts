import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { RuleOverride } from './rule-override.entity';

export type RuleScope = 'GLOBAL' | 'COMPANY';

@Entity({ name: 'rules' })
@Index(['companyId'])
@Index(['scope', 'companyId'])
@Index(['active'])
@Index(['priority'])
export class Rule extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 20, name: 'scope' })
  scope: RuleScope;

  @Column({ type: 'int', name: 'priority' })
  priority: number;

  @Column({ type: 'jsonb', name: 'criteria', default: {} })
  criteria: Record<string, unknown>;

  @Column({ type: 'boolean', name: 'active', default: true })
  active: boolean;

  @Column({ type: 'boolean', name: 'allow_company_override', default: false })
  allowCompanyOverride: boolean;

  @Column({ type: 'boolean', name: 'allow_user_toggle', default: false })
  allowUserToggle: boolean;

  @Column({ type: 'int', name: 'version', default: 1 })
  version: number;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @OneToMany(() => RuleOverride, (ro) => ro.rule)
  ruleOverrides: Relation<RuleOverride>[];
}
