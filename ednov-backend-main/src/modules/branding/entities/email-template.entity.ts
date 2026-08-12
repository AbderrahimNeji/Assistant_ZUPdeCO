import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity({ name: 'email_templates' })
@Index(['companyId', 'code'], { unique: true, where: 'deleted_at IS NULL' })
export class EmailTemplate extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 500, name: 'subject', nullable: true })
  subject: string | null;

  @Column({ type: 'text', name: 'body_html', nullable: true })
  bodyHtml: string | null;

  @Column({ type: 'text', name: 'body_text', nullable: true })
  bodyText: string | null;

  @Column({ type: 'jsonb', name: 'variables', default: [] })
  variables: unknown[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
