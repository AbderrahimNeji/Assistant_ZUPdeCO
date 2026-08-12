import * as React from 'react';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { usePreferencesConfig } from '@/hooks/usePreferencesConfig';
import type { InterfaceElement } from '@/types/interface-elements.types';

export interface UseFilterVisibilityOptions<FID extends string> {
  /** Clé de stockage des préférences utilisateur (ex: 'sessions-matching') */
  preferencesName: string;
  /** Clé RBAC pour les interface elements (ex: 'sessions') */
  elementsName: string;
  /** Tous les IDs de groupes de filtres possibles */
  allFilterGroupIds: readonly FID[];
}

export interface UseFilterVisibilityReturn<FID extends string> {
  filterVisibility: Record<FID, boolean>;
  visibleFilterIds: FID[];
  allowedFilterIds: FID[];
  handleToggleFilterVisibility: (id: FID) => void;
  isSavingFilterVisibility: boolean;
  /** Elements visibles/triés (subset RBAC) */
  interfaceElements: InterfaceElement[];
  /** Tous les elements DB (inclus hidden) */
  allElements: InterfaceElement[];
}

export function useFilterVisibility<FID extends string>(
  options: UseFilterVisibilityOptions<FID>,
): UseFilterVisibilityReturn<FID> {
  const { preferencesName, elementsName, allFilterGroupIds } = options;

  // ── RBAC ──────────────────────────────────────────────────────────────────
  const { elements: interfaceElements, allElements } = useInterfaceElements(elementsName);

  /**
   * IDs autorisés par le RBAC.
   * Fallback sur tous les IDs quand aucune entrée DB n'existe pour cette interface
   * (cas des colonnes de matching qui n'ont pas forcément d'entrées RBAC dédiées).
   */
  const allowedFilterIds = React.useMemo<FID[]>(() => {
    if (allElements.length === 0) return [...allFilterGroupIds] as FID[];
    const dbIds = new Set(allElements.map((el) => el.elementId));
    const matched = allFilterGroupIds.filter((id) => dbIds.has(id));
    return matched.length > 0 ? matched : ([...allFilterGroupIds] as FID[]);
  }, [allElements, allFilterGroupIds]);

  // ── Préférences ───────────────────────────────────────────────────────────
  const {
    config,
    saveConfig,
    isSaving: isSavingFilterVisibility,
  } = usePreferencesConfig(preferencesName);

  // ── Visibilité des filtres ────────────────────────────────────────────────
  const filterVisibility = React.useMemo<Record<FID, boolean>>(() => {
    const explicitVisibility =
      (config && typeof config === 'object' && 'filterVisibility' in config
        ? (config as { filterVisibility?: Record<string, boolean> }).filterVisibility
        : undefined) ?? {};

    const result = {} as Record<FID, boolean>;
    for (const id of allFilterGroupIds) {
      if (!allowedFilterIds.includes(id)) continue;
      const element = allElements.find((el) => el.elementId === id);
      const backendDefault = element?.visible ?? true;
      result[id] = id in explicitVisibility ? !!explicitVisibility[id] : backendDefault;
    }
    return result;
  }, [allFilterGroupIds, allowedFilterIds, config, allElements]);

  const visibleFilterIds = React.useMemo<FID[]>(
    () =>
      (Object.entries(filterVisibility) as Array<[FID, boolean]>)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [filterVisibility],
  );

  const handleToggleFilterVisibility = React.useCallback(
    (filterId: FID) => {
      const element = interfaceElements.find((el) => el.elementId === filterId);
      const backendDefault = element?.visible ?? true;
      const current = filterVisibility[filterId] ?? backendDefault;
      const newVisibility = Object.fromEntries(
        Object.entries({ ...filterVisibility, [filterId]: !current }).filter(([id]) =>
          (allowedFilterIds as string[]).includes(id),
        ),
      ) as Record<string, boolean>;
      saveConfig({
        ...(config && typeof config === 'object' ? config : {}),
        filterVisibility: newVisibility,
      });
    },
    [filterVisibility, saveConfig, config, interfaceElements, allowedFilterIds],
  );

  return {
    filterVisibility,
    visibleFilterIds,
    allowedFilterIds,
    handleToggleFilterVisibility,
    isSavingFilterVisibility,
    interfaceElements,
    allElements,
  };
}
