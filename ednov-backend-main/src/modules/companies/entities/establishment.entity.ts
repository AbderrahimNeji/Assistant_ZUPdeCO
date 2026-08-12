import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { EstablishmentSpecialty } from '../../specialties/entities/establishment-specialty.entity';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from './company.entity';
import { User } from '../../users/entities/user.entity';
import { Room } from './room.entity';

export type EstablishmentType = 'primaire' | 'college' | 'lycee' | 'professionnel' | 'other';
export type EstablishmentStatus = 'active' | 'suspended' | 'closed';
export type EstablishmentCategory = 'public' | 'private';
export type EstablishmentPriorityNetwork = 'rep' | 'rep_plus' | 'none';
export type PartnerRelationshipQuality = 'very_bad' | 'bad' | 'average' | 'good' | 'very_good';
export type CalendarType = 'none' | 'weekly' | 'ab';
export interface EstablishmentContact {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  fonction?: string;
}

@Entity({ name: 'establishments' })
@Index(['companyId'])
@Index(['companyId', 'status'])
export class Establishment extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 20, name: 'uai_code', nullable: true })
  uaiCode: string | null;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'official_name', nullable: true })
  officialName: string | null;

  @Column({ type: 'varchar', length: 50, name: 'type', nullable: true })
  type: EstablishmentType | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: EstablishmentStatus;

  @Column({ type: 'varchar', length: 255, name: 'address_line1', nullable: true })
  addressLine1: string | null;

  @Column({ type: 'varchar', length: 100, name: 'department', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 20, name: 'postal_code', nullable: true })
  postalCode: string | null;

  @Column({ type: 'varchar', length: 100, name: 'city', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 2, name: 'country', default: 'FR' })
  country: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'latitude', nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'longitude', nullable: true })
  longitude: string | null;

  @Column({ type: 'varchar', length: 20, name: 'calendar_type', nullable: true })
  calendarType: CalendarType | null;

  @Column({ type: 'varchar', length: 50, name: 'timezone', nullable: true })
  timezone: string | null;

  @Column({ type: 'varchar', length: 255, name: 'contact_name', nullable: true })
  contactName: string | null;

  @Column({ type: 'varchar', length: 255, name: 'contact_email', nullable: true })
  contactEmail: string | null;

  @Column({ type: 'varchar', length: 50, name: 'contact_phone', nullable: true })
  contactPhone: string | null;

  @Column({ type: 'jsonb', name: 'contacts', nullable: true, default: () => "'[]'::jsonb" })
  contacts: EstablishmentContact[] | null;

  @Column({ type: 'int', name: 'student_quota', nullable: true })
  studentQuota: number | null;

  @Column({ type: 'int', name: 'volunteer_quota', nullable: true })
  volunteerQuota: number | null;

  @Column({ type: 'jsonb', name: 'gov_data', nullable: true })
  govData: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, name: 'ips_value', nullable: true })
  ipsValue: number | null;

  @Column({ type: 'varchar', length: 20, name: 'ips_year', nullable: true })
  ipsYear: string | null;

  @Column({ type: 'varchar', length: 100, name: 'ips_source', nullable: true })
  ipsSource: string | null;

  @Column({ type: 'varchar', length: 20, name: 'establi_category', nullable: true })
  establiCategory: EstablishmentCategory | null;

  @Column({ type: 'varchar', length: 20, name: 'priority_network', nullable: true })
  priorityNetwork: EstablishmentPriorityNetwork | null;

  @Column({ type: 'date', name: 'engagement_start_date', nullable: true })
  engagementStartDate: Date | null;

  @Column({ type: 'date', name: 'engagement_end_date', nullable: true })
  engagementEndDate: Date | null;

  @Column({ type: 'boolean', name: 'is_qpv', nullable: true })
  isQpv: boolean | null;

  @Column({ type: 'boolean', name: 'renewal_next_year', nullable: true })
  renewalNextYear: boolean | null;

  @Column({ type: 'boolean', name: 'has_devoirs_faits', nullable: true })
  hasDevoirsFaits: boolean | null;

  @Column({ type: 'boolean', name: 'has_internat', nullable: true })
  hasInternat: boolean | null;

  @Column({ type: 'smallint', name: 'involvement_level', nullable: true })
  involvementLevel: number | null;

  @Column({ type: 'varchar', length: 20, name: 'partner_relationship_quality', nullable: true })
  partnerRelationshipQuality: PartnerRelationshipQuality | null;

  @Column({ type: 'boolean', name: 'convention_signed', nullable: true })
  conventionSigned: boolean | null;

  @Column({ type: 'uuid', name: 'managed_by_id', nullable: true })
  managedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'managed_by_id' })
  managedBy: Relation<User> | null;

  @OneToMany(() => Room, (room) => room.establishment)
  rooms: Relation<Room[]>;

  @OneToMany(() => EstablishmentSpecialty, (es) => es.establishment)
  establishmentSpecialties: Relation<EstablishmentSpecialty[]>;

  roomsCount?: number;

  /** Active volunteers (VSC) linked via user_establishments — computed, not persisted. */
  vscCount?: number;
}
