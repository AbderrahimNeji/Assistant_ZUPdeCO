import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Establishment } from '../../companies/entities/establishment.entity';
import { VacationZone } from './vacation-zone.entity';

export type HolidayType = 'national' | 'regional' | 'establishment_specific';

@Entity({ name: 'holidays' })
@Index(['companyId'])
export class Holiday extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'varchar', length: 30, name: 'type' })
  type: HolidayType;

  @Column({ type: 'uuid', name: 'establishment_id', nullable: true })
  establishmentId: string | null;

  @ManyToOne(() => Establishment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment> | null;

  @Column({ type: 'uuid', name: 'vacation_zone_id', nullable: true })
  vacationZoneId: string | null;

  @ManyToOne(() => VacationZone, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vacation_zone_id' })
  vacationZone: Relation<VacationZone> | null;

  @Column({ type: 'varchar', length: 255, name: 'establishment_name', nullable: true })
  establishmentName: string | null;

  @Column({ type: 'boolean', name: 'is_recurring_yearly', default: false })
  isRecurringYearly: boolean;
}
