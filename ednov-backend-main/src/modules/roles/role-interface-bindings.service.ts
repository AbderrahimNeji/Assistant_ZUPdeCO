import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { RoleInterfaceElement } from '../interface-elements/entities/role-interface-element.entity';
import { InterfaceElement } from '../interface-elements/entities/interface-element.entity';
import { Role } from './entities/role.entity';
import { AuditLogService } from '../audit/audit.service';
import type { RoleInterfaceBindingItemDto } from './dto/role-interface-binding-item.dto';
import type { RoleInterfaceBindingResponseDto } from './dto/role-interface-binding-response.dto';

const AUDIT_ELEMENT_IDS_MAX = 50;

@Injectable()
export class RoleInterfaceBindingsService {
  constructor(
    @InjectRepository(RoleInterfaceElement)
    private readonly rieRepository: Repository<RoleInterfaceElement>,
    @InjectRepository(InterfaceElement)
    private readonly elementRepository: Repository<InterfaceElement>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listBindings(companyId: string, roleId: string): Promise<RoleInterfaceBindingResponseDto[]> {
    await this.assertRoleForBindingsRead(companyId, roleId);

    const rows = await this.rieRepository.find({
      where: { companyId, roleId },
      relations: ['element'],
      order: { createdAt: 'ASC' },
    });

    return rows
      .filter((r) => r.element)
      .map((r) => ({
        bindingId: r.id,
        elementId: r.elementId,
        elementKey: r.element!.elementId,
        interfaceName: r.element!.interfaceName,
        elementLabel: r.element!.elementLabel,
        visibilityScope: r.visibilityScope,
      }));
  }

  async replaceBindings(
    companyId: string,
    roleId: string,
    items: RoleInterfaceBindingItemDto[],
    actorId?: string,
  ): Promise<void> {
    const role = await this.assertRoleMutable(companyId, roleId);
    const deduped = this.dedupeByElementId(items);
    await this.validateElements(companyId, deduped);

    const oldCount = await this.rieRepository.count({ where: { companyId, roleId } });

    await this.dataSource.transaction(async (em) => {
      await this.replaceBindingsWithManager(em, companyId, roleId, deduped);
    });

    await this.auditLogService.log({
      companyId,
      userId: actorId,
      entity: 'role_interface_elements',
      entityId: roleId,
      action: 'UPDATE',
      oldValue: { previousBindingCount: oldCount } as Record<string, unknown>,
      newValue: {
        bindingCount: deduped.length,
        elementIds: deduped.map((i) => i.elementId).slice(0, AUDIT_ELEMENT_IDS_MAX),
      },
    });
  }

  /**
   * Used inside an outer transaction (e.g. role create + bindings).
   */
  async replaceBindingsWithManager(
    em: EntityManager,
    companyId: string,
    roleId: string,
    items: RoleInterfaceBindingItemDto[],
  ): Promise<void> {
    const deduped = this.dedupeByElementId(items);
    await this.validateElementsWithManager(em, companyId, deduped);
    await em.delete(RoleInterfaceElement, { companyId, roleId });
    for (const item of deduped) {
      const row = em.create(RoleInterfaceElement, {
        companyId,
        roleId,
        elementId: item.elementId,
        visibilityScope: item.visibilityScope ?? null,
      });
      await em.save(RoleInterfaceElement, row);
    }
  }

  async cloneBindingsWithManager(
    em: EntityManager,
    companyId: string,
    targetRoleId: string,
    sourceRoleId: string,
  ): Promise<void> {
    if (targetRoleId === sourceRoleId) {
      throw new BadRequestException('Cannot clone interface bindings from the same role');
    }
    const sourceRole = await em.findOne(Role, { where: { id: sourceRoleId, companyId } });
    if (!sourceRole) {
      throw new NotFoundException(`Source role ${sourceRoleId} not found`);
    }
    const rows = await em.find(RoleInterfaceElement, { where: { companyId, roleId: sourceRoleId } });
    await em.delete(RoleInterfaceElement, { companyId, roleId: targetRoleId });
    for (const r of rows) {
      const row = em.create(RoleInterfaceElement, {
        companyId,
        roleId: targetRoleId,
        elementId: r.elementId,
        visibilityScope: r.visibilityScope,
      });
      await em.save(RoleInterfaceElement, row);
    }
  }

  async deleteAllForRole(companyId: string, roleId: string): Promise<void> {
    await this.rieRepository.delete({ companyId, roleId });
  }

  private dedupeByElementId(items: RoleInterfaceBindingItemDto[]): RoleInterfaceBindingItemDto[] {
    const map = new Map<string, RoleInterfaceBindingItemDto>();
    for (const item of items) {
      map.set(item.elementId, item);
    }
    return [...map.values()];
  }

  private async assertRoleForBindingsRead(companyId: string, roleId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId, companyId } });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    return role;
  }

  private async assertRoleMutable(companyId: string, roleId: string): Promise<Role> {
    const role = await this.assertRoleForBindingsRead(companyId, roleId);
    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot have interface bindings modified');
    }
    return role;
  }

  private async validateElements(
    companyId: string,
    items: RoleInterfaceBindingItemDto[],
  ): Promise<void> {
    if (items.length === 0) return;
    const ids = items.map((i) => i.elementId);
    const elements = await this.elementRepository.find({
      where: { id: In(ids), companyId },
    });
    if (elements.length !== ids.length) {
      throw new BadRequestException(
        'One or more interface element IDs are invalid, belong to another company, or are deleted',
      );
    }
  }

  private async validateElementsWithManager(
    em: EntityManager,
    companyId: string,
    items: RoleInterfaceBindingItemDto[],
  ): Promise<void> {
    if (items.length === 0) return;
    const ids = items.map((i) => i.elementId);
    const elements = await em.find(InterfaceElement, {
      where: { id: In(ids), companyId },
    });
    if (elements.length !== ids.length) {
      throw new BadRequestException(
        'One or more interface element IDs are invalid, belong to another company, or are deleted',
      );
    }
  }
}
