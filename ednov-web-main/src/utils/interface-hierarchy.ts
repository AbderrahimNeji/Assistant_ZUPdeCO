import type { InterfaceElement } from '@/types/interface-elements.types';

/**
 * Récupère les enfants d'un élément parent (par parentId UUID)
 * Utilisé quand le parent n'est pas dans le même interface
 */
export function getChildrenByParentId(
  elements: InterfaceElement[],
  parentId: string,
): InterfaceElement[] {
  return elements.filter((el) => el.parentId === parentId);
}

/**
 * Récupère les enfants d'un élément parent (par elementId)
 * Si le parent n'est pas trouvé dans adminElements, retourne quand même les enfants
 * dont le parentId correspond (le parent peut être dans une autre interface, ex: sidebar)
 */
export function getChildren(
  adminElements: InterfaceElement[],
  parentElementId: string,
): InterfaceElement[] {
  // Chercher le parent par elementId
  const parent = adminElements.find((el) => el.elementId === parentElementId);

  if (parent) {
    // Parent trouvé dans adminElements
    return adminElements.filter((el) => el.parentId === parent.id);
  }

  // Parent non trouvé: chercher les enfants dont le parentId pointe vers un élément
  // avec cet elementId (peut être dans une autre interface)
  // On ne peut pas filtrer directement, donc on retourne vide
  // C'est une limitation si le parent est dans une autre interface
  return [];
}

/**
 * Récupère les rôles éditables via config.subtype (interface admins/volunteers/tutors).
 * La présence d'une action avec subtype='edit-role' signifie que l'utilisateur peut modifier ce rôle
 */
export function getEditableRoles(
  elements: InterfaceElement[],
): Array<{ value: string; label: string }> {
  return elements
    .filter((el) => el.elementType === 'action' && (el.config as any)?.subtype === 'edit-role')
    .map((el) => ({
      value: (el.config as any)?.targetRole || '',
      label: el.elementLabel,
    }));
}

/**
 * Récupère les rôles créables via config.subtype (interface admins).
 * Modèle présence : la présence d'une action avec subtype='create-role' signifie que l'utilisateur peut créer ce rôle
 */
export function getCreatableRoles(
  adminElements: InterfaceElement[],
): Array<{ value: string; label: string }> {
  return adminElements
    .filter((el) => el.elementType === 'action' && (el.config as any)?.subtype === 'create-role')
    .map((el) => ({
      value: (el.config as any)?.targetRole || '', // 'admin', 'coordinator', 'manager'
      label: el.elementLabel,
    }));
}

/**
 * Récupère les rôles disponibles pour la création depuis les tabs d'un menu donné.
 * Utilisé par les interfaces tutors, volunteers, etc. où les onglets = les rôles gérés.
 */
export function getCreatableRolesFromTabs(
  elements: InterfaceElement[],
  menuId: string,
): Array<{ value: string; label: string }> {
  return elements
    .filter((el) => el.elementType === 'tab')
    .sort((a, b) => (a.userOrder ?? a.order ?? Infinity) - (b.userOrder ?? b.order ?? Infinity))
    .map((el) => ({
      value: el.elementId.replace('tab-', ''),
      label: el.elementLabel,
    }));
}
