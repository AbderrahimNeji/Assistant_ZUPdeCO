import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

export type MediaAssetType = 'logo' | 'icon' | 'banner' | 'document' | 'email_template';

@Entity({ name: 'media_assets' })
@Index(['companyId'])
export class MediaAsset extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 30, name: 'type' })
  type: MediaAssetType;

  @Column({ type: 'varchar', length: 255, name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 500, name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'varchar', length: 50, name: 'file_type', nullable: true })
  fileType: string | null;

  @Column({ type: 'bigint', name: 'file_size', nullable: true })
  fileSize: string | null;

  @Column({ type: 'boolean', name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: Relation<User> | null;
}
