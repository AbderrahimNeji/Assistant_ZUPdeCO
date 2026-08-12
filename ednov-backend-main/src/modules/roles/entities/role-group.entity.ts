import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

/**
 * Represents a family/group of roles (e.g. "admins", "tutors", "students").
 * Replaces the hardcoded `roleGroup` string on Role with a proper FK relation.
 *
 * Each company can have custom role groups. A set of system defaults is seeded.
 */
@Entity({ name: 'role_groups' })
@Index(['companyId', 'code'], { unique: true, where: 'deleted_at IS NULL' })
export class RoleGroupEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  /** Stable machine-readable code (e.g. 'admins', 'tutors', 'students'). */
  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  /** Human-readable label (e.g. "Administrateurs"). */
  @Column({ type: 'varchar', length: 100, name: 'label' })
  label: string;

  /** Default Lucide icon name for the group (e.g. 'Shield', 'GraduationCap'). */
  @Column({ type: 'varchar', length: 100, name: 'icon', nullable: true })
  icon: string | null;

  /** Default color for the group (CSS value or palette token). */
  @Column({ type: 'varchar', length: 50, name: 'color', nullable: true })
  color: string | null;

  /**
   * Mode flag for présentiel/distanciel/hybrid support.
   * null = applies to all modes.
   */
  @Column({ type: 'varchar', length: 20, name: 'mode', nullable: true })
  mode: 'in_person' | 'remote' | 'hybrid' | null;

  /** Display order in the UI (lower = first). */
  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  /** Whether this is a system-managed group (cannot be deleted). */
  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem: boolean;
}
