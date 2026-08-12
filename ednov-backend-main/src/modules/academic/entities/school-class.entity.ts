import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Establishment } from '../../companies/entities/establishment.entity';
import { SchoolYear } from './school-year.entity';
import { Level } from './level.entity';

@Entity({ name: 'school_classes' })
@Index(['companyId'])
@Index(['establishmentId'])
@Index(['schoolYearId'])
@Index(['levelId'])
export class SchoolClass extends SoftDeleteBaseEntity {
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

  @Column({ type: 'uuid', name: 'school_year_id' })
  schoolYearId: string;

  @ManyToOne(() => SchoolYear, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'school_year_id' })
  schoolYear: Relation<SchoolYear>;

  @Column({ type: 'uuid', name: 'level_id' })
  levelId: string;

  @ManyToOne(() => Level, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'level_id' })
  level: Relation<Level>;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'int', name: 'student_count', nullable: true })
  studentCount: number | null;
}
