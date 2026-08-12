import { Entity, Column, ManyToOne, JoinColumn, Index, Relation, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';

export type TutorCriminalRecordStatus = 'pending' | 'validated';

@Entity({ name: 'tutor_criminal_records' })
@Unique(['companyId', 'userId'])
@Index(['companyId', 'userId'])
@Index(['companyId', 'status'])
export class TutorCriminalRecord extends BaseEntity {
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

  @Column({ type: 'varchar', length: 500, name: 'storage_path' })
  storagePath: string;

  @Column({ type: 'varchar', length: 255, name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', length: 100, name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint', name: 'file_size' })
  fileSize: string;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'pending' })
  status: TutorCriminalRecordStatus;

  @Column({ type: 'timestamptz', name: 'deposited_at' })
  depositedAt: Date;

  @Column({ type: 'timestamptz', name: 'validated_at', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'uuid', name: 'validated_by_user_id', nullable: true })
  validatedByUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'validated_by_user_id' })
  validatedByUser: Relation<User> | null;
}
