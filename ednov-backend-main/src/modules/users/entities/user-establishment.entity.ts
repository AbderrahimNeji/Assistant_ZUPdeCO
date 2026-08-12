import { Entity, Column, Index, ManyToOne, JoinColumn, Unique, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { Establishment } from '../../companies/entities/establishment.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity({ name: 'user_establishments' })
@Unique(['userId', 'establishmentId'])
@Index(['establishmentId'])
@Index(['companyId'])
export class UserEstablishment extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'uuid', name: 'establishment_id' })
  establishmentId: string;

  @ManyToOne(() => Establishment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment>;

  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;
}
