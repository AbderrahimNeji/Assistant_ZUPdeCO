import { Entity, Column, Index, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EstablishmentSpecialty } from './establishment-specialty.entity';
import { UserProfileSpecialty } from './user-profile-specialty.entity';
import { SpecialtyLevel } from './specialty-level.entity';

@Entity({ name: 'specialties' })
@Index(['isActive'])
export class Specialty extends BaseEntity {
  @Column({ type: 'varchar', length: 64, name: 'code', unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'label' })
  label: string;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => EstablishmentSpecialty, (es) => es.specialty)
  establishmentLinks: Relation<EstablishmentSpecialty[]>;

  @OneToMany(() => UserProfileSpecialty, (ups) => ups.specialty)
  userProfileLinks: Relation<UserProfileSpecialty[]>;

  @OneToMany(() => SpecialtyLevel, (sl) => sl.specialty)
  levelLinks: Relation<SpecialtyLevel[]>;
}
