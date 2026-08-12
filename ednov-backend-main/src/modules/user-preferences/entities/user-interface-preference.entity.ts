import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

export interface InterfaceConfig {
  dashboard?: {
    cards?: Array<{
      id: string;
      visible: boolean;
      order: number;
      position?: { x: number; y: number };
    }>;
    layout?: 'grid' | 'list' | 'compact';
    filters?: Record<string, unknown>;
  };
  sessions?: {
    filters?: Record<string, unknown>;
    columns?: string[];
    defaultView?: string;
  };
  postits?: {
    positions: Array<{
      id: string;
      order: number;
      section: 'active' | 'overdue' | 'done';
    }>;
    sortBy: 'deadline' | 'priority' | 'custom';
    itemsPerRow?: number;
    showCollapsed?: boolean;
  };
  calendar?: {
    defaultView: 'month' | 'week' | 'day' | 'agenda';
    eventSources: Array<'session' | 'postit' | 'holiday'>;
    miniCalendarPosition?: { x: number; y: number };
    /** Filtre vacances scolaires (UUID zone A/B/C) ; absent = toutes les zones */
    vacationZoneId?: string;
  };
  [key: string]: unknown;
}

@Entity({ name: 'user_interface_preferences' })
@Index(['userId'], { unique: true })
@Index(['companyId'])
export class UserInterfacePreference extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'boolean', name: 'is_dark_mode', default: false })
  isDarkMode: boolean;

  @Column({ type: 'jsonb', name: 'interface_configs', default: {} })
  interfaceConfigs: InterfaceConfig;
}
