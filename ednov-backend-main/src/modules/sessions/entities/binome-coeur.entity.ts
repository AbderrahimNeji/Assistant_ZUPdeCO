import { Entity, Column, Index, ManyToOne, JoinColumn, Unique, Relation } from 'typeorm';
import { CreateOnlyBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Establishment } from '../../companies/entities/establishment.entity';
import { Subject } from '../../academic/entities/subject.entity';
import { User } from '../../users/entities/user.entity';

export type BinomeCoeurSource = 'manual' | 'auto';

@Entity({ name: 'core_pairs' })
@Unique(['companyId', 'establishmentId', 'subjectId', 'studentUserId', 'tutorUserId'])
@Index(['companyId', 'establishmentId', 'subjectId'])
export class BinomeCoeur extends CreateOnlyBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'establishment_id', nullable: true })
  establishmentId: string | null;

  @ManyToOne(() => Establishment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: Relation<Establishment> | null;

  @Column({ type: 'uuid', name: 'subject_id', nullable: true })
  subjectId: string | null;

  @ManyToOne(() => Subject, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subject_id' })
  subject: Relation<Subject> | null;

  @Column({ type: 'uuid', name: 'student_user_id' })
  studentUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_user_id' })
  studentUser: Relation<User>;

  @Column({ type: 'uuid', name: 'tutor_user_id' })
  tutorUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_user_id' })
  tutorUser: Relation<User>;

  @Column({ type: 'varchar', length: 20, name: 'source', default: 'manual' })
  source: BinomeCoeurSource;
}
