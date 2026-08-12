import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany, Relation } from 'typeorm';
import { SoftDeleteBaseEntity } from '../../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export type ElementType =
  | 'stat_card'
  | 'table'
  | 'chart'
  | 'widget'
  | 'list'
  | 'form'
  | 'custom'
  | 'menu'
  | 'action'
  | 'tab'
  | 'filter';
export type ElementWidth = '1/3' | '1/2' | '2/3' | 'full' | 'auto';

@Entity({ name: 'interface_elements' })
@Index(['companyId'])
@Index(['interfaceName'])
@Index(['elementType'])
@Index(['companyId', 'interfaceName', 'elementId'], { unique: true })
export class InterfaceElement extends SoftDeleteBaseEntity {
  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Relation<Company>;

  @Column({ type: 'varchar', length: 100, name: 'interface_name' })
  interfaceName: string;

  @Column({ type: 'varchar', length: 100, name: 'element_id' })
  elementId: string;

  @Column({ type: 'varchar', length: 50, name: 'element_type' })
  elementType: ElementType;

  @Column({ type: 'varchar', length: 255, name: 'element_label' })
  elementLabel: string;

  @Column({ type: 'jsonb', name: 'config', default: {} })
  config: Record<string, unknown>;

  @Column({ type: 'varchar', length: 255, name: 'group_label', nullable: true })
  groupLabel: string | null;

  @Column({ type: 'varchar', length: 50, name: 'group_icon', nullable: true })
  groupIcon: string | null;

  @Column({ type: 'int', name: 'group_order', default: 0 })
  groupOrder: number;

  @Column({ type: 'uuid', name: 'parent_id', nullable: true })
  parentId: string | null;

  @ManyToOne(() => InterfaceElement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Relation<InterfaceElement> | null;

  /**
   * Sub-key for entity subcategory filtering (e.g. session_format).
   * When present, this IE represents a specific subcategory of the parent entity.
   * Used in conjunction with entityFilter to scope visibility by subcategory.
   */
  @Column({ type: 'varchar', length: 100, name: 'entity_sub_key', nullable: true })
  entitySubKey: string | null;

  /**
   * JSON filter expression that identifies the subcategory.
   * E.g. { "session_format": "in_person" } for a sessions IE that only applies to in-person sessions.
   */
  @Column({ type: 'jsonb', name: 'entity_filter', nullable: true })
  entityFilter: Record<string, unknown> | null;

  /**
   * Mode flag for présentiel/distanciel/hybrid support.
   * null = applies to all modes (default).
   */
  @Column({ type: 'varchar', length: 20, name: 'mode', nullable: true })
  mode: 'in_person' | 'remote' | 'hybrid' | null;

  @OneToMany('RoleInterfaceElement', 'element')
  roleElements: any[];
}
