import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { SchoolYearQuarter } from './school-year-quarter.entity';

export type SchoolYearStatus = 'active' | 'closed';

@Entity({ name: 'school_years' })
@Index(['companyId'])
export class SchoolYear extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 20, name: 'code' })
  code: string;

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'boolean', name: 'is_current', default: false })
  isCurrent: boolean;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: SchoolYearStatus;

  @OneToMany(() => SchoolYearQuarter, quarter => quarter.schoolYear)
  quarters: Relation<SchoolYearQuarter[]>;
}
