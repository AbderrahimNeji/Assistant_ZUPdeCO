import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { UserRole } from '../../users/entities/user-role.entity';
import type { RoleGroup } from '../role-groups';

export type RoleStatus = 'active' | 'inactive';

@Entity({ name: 'roles' })
@Index(['companyId', 'code'], { unique: true, where: 'deleted_at IS NULL' })
export class Role extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 100, name: 'label' })
  label: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem: boolean;

  @Column({ type: 'boolean', name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', name: 'permissions', default: {} })
  permissions: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, name: 'status', default: 'active' })
  status: RoleStatus;

  @Column({ type: 'varchar', length: 32, name: 'role_group', default: 'other' })
  roleGroup: RoleGroup;

  /**
   * Hierarchical position within the role group (1 = highest authority).
   * Multiple roles can share the same level. Nullable = no hierarchy defined.
   */
  @Column({ type: 'int', name: 'hierarchy_level', nullable: true })
  hierarchyLevel: number | null;

  /** Lucide icon name for UI display (e.g. 'Shield', 'Users', 'GraduationCap'). */
  @Column({ type: 'varchar', length: 100, name: 'icon', nullable: true })
  icon: string | null;

  /** CSS color value or branding palette token for UI display. */
  @Column({ type: 'varchar', length: 50, name: 'color', nullable: true })
  color: string | null;

  /**
   * Operation mode flag. null = applicable in all modes (default).
   * Enables présentiel/distanciel/hybrid support.
   */
  @Column({ type: 'varchar', length: 20, name: 'mode', nullable: true })
  mode: 'in_person' | 'remote' | 'hybrid' | null;

  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: Relation<UserRole>[];
}
