import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity({ name: 'gamification_xp_logs' })
@Index(['userId'])
@Index(['companyId'])
@Index(['createdAt'])
export class GamificationXpLog extends CreateOnlyBaseEntity {
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

  @Column({ type: 'int', name: 'amount' })
  amount: number;

  @Column({ type: 'varchar', length: 100, name: 'action' })
  action: string;

  @Column({ type: 'uuid', name: 'source_id', nullable: true })
  sourceId: string | null;
}
