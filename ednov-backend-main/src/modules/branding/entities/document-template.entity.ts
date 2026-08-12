import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export type DocumentTemplateType = 'report' | 'certificate' | 'contract' | 'other';

@Entity({ name: 'document_templates' })
@Index(['companyId'])
export class DocumentTemplate extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 255, name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 30, name: 'type', nullable: true })
  type: DocumentTemplateType | null;

  @Column({ type: 'text', name: 'template_html', nullable: true })
  templateHtml: string | null;

  @Column({ type: 'jsonb', name: 'variables', default: [] })
  variables: unknown[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
