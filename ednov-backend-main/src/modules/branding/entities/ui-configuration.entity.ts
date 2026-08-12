import { Entity, Column, OneToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity({ name: 'ui_configurations' })
export class UiConfiguration extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id', unique: true })
  companyId: string;

  @OneToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'boolean', name: 'show_logo_in_header', default: true })
  showLogoInHeader: boolean;

  @Column({ type: 'boolean', name: 'show_company_name', default: true })
  showCompanyName: boolean;

  @Column({ type: 'boolean', name: 'enable_dark_mode_toggle', default: true })
  enableDarkModeToggle: boolean;

  @Column({ type: 'varchar', length: 10, name: 'default_language', default: 'fr' })
  defaultLanguage: string;

  @Column({ type: 'jsonb', name: 'available_languages', default: ['fr', 'en'] })
  availableLanguages: string[];

  @Column({ type: 'jsonb', name: 'dashboard_layout', default: {} })
  dashboardLayout: Record<string, unknown>;
}
