import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { Establishment } from '../../companies/entities/establishment.entity';
import { Specialty } from './specialty.entity';

@Entity({ name: 'establishment_specialties' })
export class EstablishmentSpecialty {
  @PrimaryColumn({ type: 'uuid', name: 'establishment_id' })
  establishmentId: string;

  @ManyToOne(() => Establishment, (e) => e.establishmentSpecialties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment>;

  @PrimaryColumn({ type: 'uuid', name: 'specialty_id' })
  specialtyId: string;

  @ManyToOne(() => Specialty, (s) => s.establishmentLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Relation<Specialty>;
}
