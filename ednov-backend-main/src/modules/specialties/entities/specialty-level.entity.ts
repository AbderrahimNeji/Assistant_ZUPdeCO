import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Relation } from 'typeorm';
import { Specialty } from './specialty.entity';
import { Level } from '../../academic/entities/level.entity';

@Entity({ name: 'specialty_levels' })
export class SpecialtyLevel {
  @PrimaryColumn({ type: 'uuid', name: 'specialty_id' })
  specialtyId: string;

  @PrimaryColumn({ type: 'uuid', name: 'level_id' })
  levelId: string;

  @ManyToOne(() => Specialty, (s) => s.levelLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Relation<Specialty>;

  @ManyToOne(() => Level, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'level_id' })
  level: Relation<Level>;
}
