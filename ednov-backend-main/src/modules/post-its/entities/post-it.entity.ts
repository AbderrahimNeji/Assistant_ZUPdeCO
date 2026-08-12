import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import type { PostItShare } from './post-it-share.entity';

export type PostItThematic =
  | 'seances'
  | 'matching'
  | 'tuteur'
  | 'eleves'
  | 'etablissements'
  | 'administration'
  | 'autres';

export type PostItStatus = 'en_cours' | 'depasse' | 'done';

export type PostItColor =
  | 'jaune'
  | 'orange'
  | 'rose'
  | 'vert'
  | 'violet'
  | 'bleu'
  | 'turquoise'
  | 'blanc-casse'; // Reserved for default/scheduled post-its

@Entity({ name: 'post_its' })
@Index(['companyId', 'isArchived'])
@Index(['companyId', 'createdById'])
@Index(['companyId', 'deadline'])
@Index(['companyId', 'isPriority', 'deadline'])
export class PostIt extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ type: 'varchar', length: 255, name: 'title' })
  title: string;

  @Column({ type: 'varchar', length: 50, name: 'thematic' })
  thematic: PostItThematic;

  @Column({ type: 'text', name: 'content' })
  content: string;

  @Column({ type: 'timestamptz', name: 'deadline', nullable: true })
  deadline: Date | null;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'en_cours' })
  status: PostItStatus;

  @Column({ type: 'varchar', length: 20, name: 'color', default: 'jaune' })
  color: PostItColor;

  @Column({ type: 'boolean', name: 'is_archived', default: false })
  isArchived: boolean;

  @Column({ type: 'boolean', name: 'is_priority', default: false })
  isPriority: boolean;

  @Column({ type: 'timestamptz', name: 'visible_from', nullable: true })
  visibleFrom: Date | null;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'varchar', length: 100, name: 'default_post_it_key', nullable: true })
  defaultPostItKey: string | null;

  @OneToMany(() => require('./post-it-share.entity').PostItShare, (share: PostItShare) => share.postIt)
  shares: PostItShare[];
}
