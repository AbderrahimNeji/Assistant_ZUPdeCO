import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from './company.entity';
import { Establishment } from './establishment.entity';

@Entity({ name: 'rooms' })
@Index(['companyId'])
@Index(['establishmentId'])
export class Room extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'establishment_id' })
  establishmentId: string;

  @ManyToOne(() => Establishment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment>;

  @Column({ type: 'varchar', length: 100, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'label', nullable: true })
  label: string | null;

  @Column({ type: 'int', name: 'capacity', nullable: true })
  capacity: number | null;

  @Column({ type: 'boolean', name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ type: 'jsonb', name: 'availability_rules', nullable: true })
  availabilityRules: Record<string, unknown> | null;

  @Column({ type: 'text', name: 'notes', nullable: true })
  notes: string | null;
}
