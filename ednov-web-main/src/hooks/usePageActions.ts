import { useInterfaceElements } from './useInterfaceElements';

/**
 * Hook pour accéder aux permissions d'actions UI d'une interface (boutons, actions de ligne, etc.)
 * Toutes les actions sont stockées dans `interface_elements` avec `elementType: 'action'`
 * et les permissions viennent de `role_interface_elements`.
 *
 * @param interfaceName - Nom de l'interface (ex: 'students', 'sessions', 'admins')
 * @returns Objet avec les permissions d'actions disponibles
 *
 * @example
 * const { canCreate, canEditRow, canDeleteRow } = usePageActions('students');
 *
 * {canCreate && <Button onClick={handleCreate}>Créer un élève</Button>}
 * {canEditRow && <Button onClick={handleEdit}>Modifier</Button>}
 */
/**
 * Vérifie si une action est autorisée pour une ligne spécifique.
 * Combine les permissions globales (pageActions) avec les permissions par ligne (_permissions).
 *
 * @param row - La ligne avec ses permissions (_permissions)
 * @param actionId - L'ID de l'action (ex: 'action-edit-row')
 * @param globalFallback - Permission globale si _permissions n'est pas disponible
 * @returns true si l'action est autorisée
 *
 * @example
 * const canEdit = getRowPermission(session, 'action-edit-row', pageActions?.canEditRow ?? true);
 * const canCancel = getRowPermission(session, 'action-cancel-row', pageActions?.canCancelRow ?? true);
 */
export function getRowPermission(
  row: { _permissions?: Record<string, boolean> } | null | undefined,
  actionId: string,
  globalFallback: boolean,
): boolean {
  if (!row?._permissions) return globalFallback;
  return row._permissions[actionId] ?? globalFallback;
}
export function usePageActions(interfaceName: string) {
  const { elements } = useInterfaceElements(interfaceName);

  const find = (elementId: string) => elements.find((el) => el.elementId === elementId);

  return {
    /** Peut créer une nouvelle entité (bouton header "Créer un X") */
    canCreate: !!find('action-create'),

    /** Peut modifier une ligne (bouton "Modifier" sur row/card) */
    canEditRow: !!find('action-edit-row'),

    /** Peut supprimer une ligne (bouton "Supprimer" sur row/card) */
    canDeleteRow: !!find('action-delete-row'),

    /** Peut voir les détails d'une ligne (bouton "Voir" sur row/card) */
    canViewRow: !!find('action-view-row'),

    /** Peut gérer les présences (bouton "Présences" sur row/card) */
    canManageAttendance: !!find('action-manage-attendance'),

    /** Peut importer un CSV (students uniquement) */
    canImportCsv: !!find('action-import-csv'),

    /** Peut exporter en Excel (listes) : `action-export-excel` (ou anciens `action-export-csv` / `action-export`) */
    canExportCsv: !!(
      find('action-export-excel') ||
      find('action-export-csv') ||
      find('action-export')
    ),

    /** Peut valider un compte rendu (reports, coordinateurs) */
    canValidate: !!find('action-validate'),

    /** Peut annuler une ligne (bouton "Annuler" sur row/card - ex: séances) */
    canCancelRow: !!find('action-cancel-row'),

    /** Peut voir le compte-rendu d'une séance (bouton sur row/card sessions → reports) */
    canViewReport: !!find('action-view-report'),
  };
}
