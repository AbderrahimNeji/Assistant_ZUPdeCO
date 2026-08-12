import { Entity, Column, Index } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';

export type CompanyStatus = 'active' | 'suspended' | 'closed';

@Entity({ name: 'companies' })
@Index(['code'], { unique: true, where: 'deleted_at IS NULL' })
@Index(['status'])
export class Company extends SoftDeleteBaseEntity {
  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'legal_name', nullable: true })
  legalName: string | null;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, name: 'contract_type', nullable: true })
  contractType: string | null;

  @Column({ type: 'date', name: 'contract_start_date', nullable: true })
  contractStartDate: Date | null;

  @Column({ type: 'date', name: 'contract_end_date', nullable: true })
  contractEndDate: Date | null;

  @Column({ type: 'varchar', length: 500, name: 'logo_url', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 20, name: 'primary_color', nullable: true })
  primaryColor: string | null;

  @Column({ type: 'varchar', length: 20, name: 'secondary_color', nullable: true })
  secondaryColor: string | null;

  @Column({ type: 'varchar', length: 255, name: 'domain', nullable: true })
  domain: string | null;

  @Column({ type: 'varchar', length: 50, name: 'timezone', default: 'Europe/Paris' })
  timezone: string;

  @Column({ type: 'varchar', length: 100, name: 'country', nullable: true })
  country: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'status',
    default: 'active',
  })
  status: CompanyStatus;

  @Column({ type: 'jsonb', name: 'settings', default: {} })
  settings: Record<string, unknown>;

}
