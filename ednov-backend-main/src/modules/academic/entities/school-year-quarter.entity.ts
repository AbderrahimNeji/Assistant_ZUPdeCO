import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { SchoolYear } from './school-year.entity';

@Entity({ name: 'school_year_quarters' })
@Index(['schoolYearId', 'number'], { unique: true })
@Index(['schoolYearId'])
@Index(['companyId'])
export class SchoolYearQuarter extends BaseEntity {
  @Column({ type: 'uuid', name: 'school_year_id' })
  schoolYearId: string;

  @ManyToOne(() => SchoolYear, schoolYear => schoolYear.quarters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_year_id' })
  schoolYear: Relation<SchoolYear>;

  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'int', name: 'number' })
  number: number; // 1, 2, 3

  @Column({ type: 'date', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'date', name: 'end_date' })
  endDate: Date;
}
