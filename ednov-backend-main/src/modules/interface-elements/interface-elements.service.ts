import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ElementWidth, InterfaceElement } from './entities/interface-element.entity';
import { RoleInterfaceElement } from './entities/role-interface-element.entity';
import { InterfaceElementResponseDto } from './dto/interface-element-response.dto';

type PermEntry = {
  order: number | null;
  visible: boolean | null;
  width: ElementWidth | null;
};

/** Sort comparator: userOrder > role order > Infinity (NULL = sorted last). */
function compareOrder(a: InterfaceElementResponseDto, b: InterfaceElementResponseDto): number {
  const oA = a.userOrder ?? a.order ?? Infinity;
  const oB = b.userOrder ?? b.order ?? Infinity;
  return oA - oB;
}

/** Merge two order values for multi-role users: take the minimum non-null, or null if both null. */
function mergeOrder(existing: number | null, incoming: number | null): number | null {
  if (existing === null && incoming === null) return null;
  if (existing === null) return incoming;
  if (incoming === null) return existing;
  return Math.min(existing, incoming);
}

/** Role denial (visible=false) wins over per-user dashboard layout preferences. */
function resolveEffectiveVisible(
  roleVisible: boolean | null | undefined,
  userVisible: boolean | undefined,
): boolean {
  if (roleVisible === false) {
    return false;
  }
  return userVisible ?? roleVisible ?? true;
}

@Injectable()
export class InterfaceElementsService {
  constructor(
    @InjectRepository(InterfaceElement)
    private readonly elementsRepository: Repository<InterfaceElement>,
    @InjectRepository(RoleInterfaceElement)
    private readonly roleElementsRepository: Repository<RoleInterfaceElement>,
  ) {}

  async getInterfaceElements(
    interfaceName: string,
    companyId: string,
    roleCodes: string[],
    userPreferences?: Record<string, unknown>,
  ): Promise<InterfaceElementResponseDto[]> {
    // 1. Get all elements for this interface and company (no DB-level order — sorted in memory)
    const elements = await this.elementsRepository.find({
      where: {
        interfaceName,
        companyId,
      },
    });

    if (elements.length === 0) {
      return [];
    }

    const elementIds = elements.map((e) => e.id);

    // 2. Get role IDs from role codes
    const roles = await this.elementsRepository.manager.query(
      `SELECT id FROM roles
       WHERE company_id = $1
         AND deleted_at IS NULL
         AND LOWER(code) IN (SELECT LOWER(TRIM(x)) FROM unnest($2::text[]) AS t(x))`,
      [companyId, roleCodes],
    );
    const roleIds = roles.map((r: any) => r.id);

    if (roleIds.length === 0) {
      return [];
    }

    // 3. Get role permissions for these elements
    const roleElements = await this.roleElementsRepository.find({
      where: {
        elementId: In(elementIds),
        roleId: In(roleIds),
      },
    });

    // 4. Build permission + order + visible + width map (element_id → entry)
    //    Permissions use OR logic; order uses minimum (most prominent position wins).
    //    visible uses OR logic (true if any role grants visibility).
    //    width uses first-wins (first non-null value wins).
    const permissionsMap = new Map<string, PermEntry>();

    roleElements.forEach((re) => {
      const existing = permissionsMap.get(re.elementId);
      if (!existing) {
        permissionsMap.set(re.elementId, {
          order: re.order,
          visible: re.visible,
          width: re.width,
        });
      } else {
        permissionsMap.set(re.elementId, {
          order: mergeOrder(existing.order, re.order),
          visible: existing.visible === true || re.visible === true ? true : (existing.visible ?? re.visible),
          width: existing.width ?? re.width,
        });
      }
    });

    // 5. Get user customizations from preferences
    const userCustomizations = userPreferences?.[interfaceName] as any;
    const userElementsMap = new Map<string, { visible: boolean; order: number }>();

    if (userCustomizations?.elements) {
      userCustomizations.elements.forEach((el: any) => {
        userElementsMap.set(el.id, {
          visible: el.visible ?? true,
          order: el.order ?? 0,
        });
      });
    }

    // 6. Combine everything
    const effectiveEstablishmentIds = (userPreferences as any)?.establishmentIds as string[] | undefined;
    const result: InterfaceElementResponseDto[] = elements
      .map((element) => {
        const permissions = permissionsMap.get(element.id);
        const userCustom = userElementsMap.get(element.elementId);

        if (!permissions) {
          return null;
        }

        const config = { ...(element.config ?? {}) };
        if (effectiveEstablishmentIds?.length && element.elementId === 'filter-etablissement') {
          config.establishmentIds = effectiveEstablishmentIds;
        }

        const dto: InterfaceElementResponseDto = {
          id: element.id,
          interfaceName: element.interfaceName,
          elementId: element.elementId,
          elementType: element.elementType,
          elementLabel: element.elementLabel,
          visible: resolveEffectiveVisible(permissions.visible, userCustom?.visible),
          width: permissions.width ?? 'auto',
          config,
          order: permissions.order,
          userVisible: userCustom?.visible,
          userOrder: userCustom?.order,
          groupLabel: element.groupLabel,
          groupIcon: element.groupIcon,
          groupOrder: element.groupOrder,
          parentId: element.parentId,
        };

        return dto;
      })
      .filter((el): el is InterfaceElementResponseDto => el !== null);

    // 7. Sort: userOrder > role order > Infinity (NULL → end)
    result.sort(compareOrder);

    return result;
  }

  async getAllElements(companyId: string): Promise<InterfaceElement[]> {
    return this.elementsRepository.find({
      where: { companyId },
      order: { interfaceName: 'ASC' },
    });
  }

  /**
   * Build hierarchical menu tree from flat interface elements.
   * Used specifically for sidebar navigation menus.
   */
  private buildMenuTree(elements: InterfaceElementResponseDto[]): InterfaceElementResponseDto[] {
    const map = new Map<string, InterfaceElementResponseDto & { children?: any[] }>();
    const roots: (InterfaceElementResponseDto & { children?: any[] })[] = [];

    elements.forEach(el => {
      map.set(el.elementId, { ...el, children: [] });
    });

    elements.forEach(el => {
      const parentId = el.config?.parentId as string | undefined;
      const menuItem = map.get(el.elementId);

      if (!menuItem) return;

      if (!parentId) {
        roots.push(menuItem);
      } else {
        const parent = map.get(parentId);
        if (parent && parent.children) {
          parent.children.push(menuItem);
        }
      }
    });

    const sortByOrder = (items: (InterfaceElementResponseDto & { children?: any[] })[]) => {
      items.sort(compareOrder);
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortByOrder(item.children);
        }
      });
    };

    sortByOrder(roots);
    return roots;
  }

  /**
   * Get menu tree for sidebar navigation.
   * Filters for menu-type elements and builds hierarchical structure.
   */
  async getMenuTree(
    companyId: string,
    roleCodes: string[],
    userPreferences?: Record<string, unknown>,
  ): Promise<InterfaceElementResponseDto[]> {
    const elements = await this.getInterfaceElements(
      'sidebar',
      companyId,
      roleCodes,
      userPreferences,
    );

    const menuElements = elements.filter(el => el.elementType === 'menu');
    return this.buildMenuTree(menuElements);
  }

  /**
   * Get ALL interface elements grouped by interface name.
   * Optimized single-pass query for bulk loading at login.
   */
  async getAllInterfaceElementsGrouped(
    companyId: string,
    roleCodes: string[],
    userPreferences?: Record<string, unknown>,
  ): Promise<Record<string, InterfaceElementResponseDto[]>> {
    // 1. Get ALL elements for this company in one query
    const allElements = await this.elementsRepository.find({
      where: { companyId },
      order: { interfaceName: 'ASC' },
    });

    if (allElements.length === 0) {
      return {};
    }

    const elementIds = allElements.map((e) => e.id);

    // 2. Get role IDs from role codes
    const roles = await this.elementsRepository.manager.query(
      `SELECT id FROM roles
       WHERE company_id = $1
         AND deleted_at IS NULL
         AND LOWER(code) IN (SELECT LOWER(TRIM(x)) FROM unnest($2::text[]) AS t(x))`,
      [companyId, roleCodes],
    );
    const roleIds = roles.map((r: any) => r.id);

    if (roleIds.length === 0) {
      return {};
    }

    // 3. Get ALL role permissions in one query
    const roleElements = await this.roleElementsRepository.find({
      where: {
        elementId: In(elementIds),
        roleId: In(roleIds),
      },
    });

    // 4. Build permission + order + visible + width map (modèle présence)
    const permissionsMap = new Map<string, PermEntry>();
    roleElements.forEach((re) => {
      const existing = permissionsMap.get(re.elementId);
      if (!existing) {
        permissionsMap.set(re.elementId, {
          order: re.order,
          visible: re.visible,
          width: re.width,
        });
      } else {
        permissionsMap.set(re.elementId, {
          order: mergeOrder(existing.order, re.order),
          visible: existing.visible === true || re.visible === true ? true : (existing.visible ?? re.visible),
          width: existing.width ?? re.width,
        });
      }
    });

    // 5. Group elements by interface name
    const groupedElements: Record<string, InterfaceElementResponseDto[]> = {};

    allElements.forEach((element) => {
      const permissions = permissionsMap.get(element.id);

      if (!permissions) {
        return;
      }

      const interfaceName = element.interfaceName;
      const userCustomizations = userPreferences?.[interfaceName] as any;
      const userElementsMap = new Map<string, { visible: boolean; order: number }>();

      if (userCustomizations?.elements) {
        Object.entries(userCustomizations.elements).forEach(([elementId, custom]: [string, any]) => {
          userElementsMap.set(elementId, {
            visible: custom.visible ?? true,
            order: custom.order ?? 999,
          });
        });
      }

      const userCustom = userElementsMap.get(element.elementId);
      const config = { ...(element.config ?? {}) };

      const dto: InterfaceElementResponseDto = {
        id: element.id,
        interfaceName: element.interfaceName,
        elementId: element.elementId,
        elementType: element.elementType,
        elementLabel: element.elementLabel,
        visible: resolveEffectiveVisible(permissions.visible, userCustom?.visible),
        width: permissions.width ?? 'auto',
        config,
        order: permissions.order,
        userVisible: userCustom?.visible,
        userOrder: userCustom?.order,
        groupLabel: element.groupLabel,
        groupIcon: element.groupIcon,
        groupOrder: element.groupOrder,
        parentId: element.parentId,
      };

      if (!groupedElements[interfaceName]) {
        groupedElements[interfaceName] = [];
      }
      groupedElements[interfaceName].push(dto);
    });

    // 6. Sort each interface's elements
    Object.keys(groupedElements).forEach((iface) => {
      groupedElements[iface].sort(compareOrder);
    });

    return groupedElements;
  }

  /**
   * Get ALL interface elements for the role permissions builder (no role filtering).
   * Returns all elements grouped by interface name, with default values for order/visible/width.
   * Used by the role creation/edit UI to show all available elements regardless of the user's own role.
   */
  async getAllInterfaceElementsForBuilder(
    companyId: string,
  ): Promise<Record<string, InterfaceElementResponseDto[]>> {
    const allElements = await this.elementsRepository.find({
      where: { companyId },
    });

    if (allElements.length === 0) {
      return {};
    }

    // Group elements by interface name
    const groupedElements: Record<string, InterfaceElementResponseDto[]> = {};

    allElements.forEach((element) => {
      const interfaceName = element.interfaceName;

      const dto: InterfaceElementResponseDto = {
        id: element.id,
        interfaceName: element.interfaceName,
        elementId: element.elementId,
        elementType: element.elementType,
        elementLabel: element.elementLabel,
        visible: true, // Default: all visible in builder
        width: 'auto', // Default width
        config: element.config ?? {},
        order: null, // No role-based order
        userVisible: undefined,
        userOrder: undefined,
        groupLabel: element.groupLabel,
        groupIcon: element.groupIcon,
        groupOrder: element.groupOrder,
        parentId: element.parentId,
      };

      if (!groupedElements[interfaceName]) {
        groupedElements[interfaceName] = [];
      }
      groupedElements[interfaceName].push(dto);
    });

    // Sort each interface's elements by groupOrder then elementId
    Object.keys(groupedElements).forEach((iface) => {
      groupedElements[iface].sort((a, b) => {
        if (a.groupOrder !== b.groupOrder) {
          return (a.groupOrder ?? 999) - (b.groupOrder ?? 999);
        }
        return a.elementId.localeCompare(b.elementId);
      });
    });

    return groupedElements;
  }
}
