import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Subject } from '../../academic/entities/subject.entity';
import { Level } from '../../academic/entities/level.entity';

@Entity({ name: 'pedagogical_resources' })
@Index(['companyId'])
export class PedagogicalResource extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'text', name: 'title' })
  title: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'text', name: 'url', nullable: true })
  url: string | null;

  @Column({ type: 'text', name: 'content', nullable: true })
  content: string | null;

  @Column({ type: 'uuid', name: 'subject_id', nullable: true })
  subjectId: string | null;

  @ManyToOne(() => Subject, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subject_id' })
  subject: Relation<Subject> | null;

  @Column({ type: 'uuid', name: 'level_id', nullable: true })
  levelId: string | null;

  @ManyToOne(() => Level, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'level_id' })
  level: Relation<Level> | null;

  @Column({ type: 'varchar', length: 50, name: 'type', nullable: true })
  type: string | null;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;
}
