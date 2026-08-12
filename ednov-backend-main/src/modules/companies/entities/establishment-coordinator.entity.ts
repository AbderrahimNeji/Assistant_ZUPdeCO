import { Entity, Column, Index, ManyToOne, JoinColumn, Unique, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Establishment } from './establishment.entity';
import { Company } from './company.entity';

@Entity({ name: 'establishment_coordinators' })
@Unique(['establishmentId', 'coordinatorId'])
@Index(['establishmentId'])
@Index(['coordinatorId'])
@Index(['companyId'])
export class EstablishmentCoordinator extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'establishment_id' })
  establishmentId: string;

  @ManyToOne(() => Establishment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment>;

  @Column({ type: 'uuid', name: 'coordinator_id' })
  coordinatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coordinator_id' })
  coordinator: Relation<User>;

  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;
}
