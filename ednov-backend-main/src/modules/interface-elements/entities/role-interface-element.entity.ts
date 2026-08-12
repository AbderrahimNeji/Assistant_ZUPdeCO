import { Entity, Column, Index, ManyToOne, JoinColumn, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Role } from '../../roles/entities/role.entity';
import { ElementWidth, InterfaceElement } from './interface-element.entity';
import type { VisibilityScope } from '../../../common/visibility/visibility-scope.types';

@Entity({ name: 'role_interface_elements' })
@Index(['companyId'])
@Index(['roleId'])
@Index(['elementId'])
@Index(['roleId', 'elementId'], { unique: true })
export class RoleInterfaceElement extends BaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Relation<Role>;

  @Column({ type: 'uuid', name: 'element_id' })
  elementId: string;

  @ManyToOne(() => InterfaceElement, (element) => element.roleElements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'element_id' })
  element: Relation<InterfaceElement>;

  /** Per-role display order. NULL = no order defined for this element in this role (sorted last). */
  @Column({ type: 'int', name: 'order', nullable: true })
  order: number | null;

  /** Per-role default visibility. NULL = fallback to true. Supersedes interface_elements.default_visible. */
  @Column({ type: 'boolean', name: 'visible', nullable: true })
  visible: boolean | null;

  /** Per-role default width (1/3, 1/2, 2/3, full, auto). NULL = fallback to auto. Supersedes interface_elements.default_width. */
  @Column({ type: 'varchar', length: 20, name: 'width', nullable: true })
  width: ElementWidth | null;

  /** Périmètre de données pour certains éléments (ex. onglets admins). `assignment` = filtrage par lien missions/affectations (à appliquer côté API concernée). */
  @Column({ type: 'jsonb', name: 'visibility_scope', nullable: true })
  visibilityScope: VisibilityScope | null;
}