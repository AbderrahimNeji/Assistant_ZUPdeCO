import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Rule } from './rule.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'rule_overrides' })
@Index(['ruleId', 'companyId'])
@Index(['ruleId', 'userId'])
export class RuleOverride extends BaseEntity {
  @Column({ type: 'uuid', name: 'rule_id' })
  ruleId: string;

  @ManyToOne(() => Rule, (r) => r.ruleOverrides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: Relation<Rule>;

  @Column({ type: 'uuid', name: 'company_id', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company> | null;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  @Column({ type: 'jsonb', name: 'criteria', nullable: true })
  criteria: Record<string, unknown> | null;

  @Column({ type: 'boolean', name: 'active', default: true })
  active: boolean;
}
