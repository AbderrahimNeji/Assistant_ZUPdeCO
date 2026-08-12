import * as React from 'react';
import { useViewMode } from '@/hooks/useViewMode';
import { useDataTableItemsPerPage } from '@/hooks/useDataTableItemsPerPage';
import { useFilterVisibility } from '@/hooks/useFilterVisibility';
import { resolveDataTableItemsPerPage } from '@/lib/data-table-page-size';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth, InterfaceElement } from '@/types/interface-elements.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseDataTableOptions<TFilters extends object, FID extends string = string> {
  tableName: string;
  defaultFilters: TFilters;
  allFilterGroupIds: readonly FID[];
  layoutWidth?: ElementWidth;
  isSection?: boolean;
  externalViewMode?: ViewMode;
  onExternalViewModeChange?: (mode: ViewMode) => void;
  externalExpandedRowId?: string | null;
  /** true → hook gère expandedRowId en state interne (ex: PairsDataTable) */
  manageExpandedRowId?: boolean;
  /** item résolu correspondant à expandedRowId, sert de dep pour l'effet scroll */
  expandedItem?: unknown;
  /** appelé lors du changement de view mode pour fermer le panneau détail ouvert */
  onCloseDetails?: () => void;
}

export interface UseDataTableReturn<TFilters extends object, FID extends string = string> {
  // View mode
  viewMode: ViewMode;
  handleViewModeChange: (mode: ViewMode) => void;
  // Pagination (totalPages/startIndex/endIndex calculés par le DataTable spécifique)
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  // Filters state
  filters: TFilters;
  setFilters: React.Dispatch<React.SetStateAction<TFilters>>;
  clearFilters: () => void;
  showFilters: boolean;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  showConfigure: boolean;
  setShowConfigure: React.Dispatch<React.SetStateAction<boolean>>;
  // RBAC + filter visibility
  filterVisibility: Record<FID, boolean>;
  visibleFilterIds: FID[];
  handleToggleFilterVisibility: (id: FID) => void;
  isSavingFilterVisibility: boolean;
  allowedFilterIds: string[];
  interfaceElements: InterfaceElement[];
  // Delete state
  deleteId: string | null;
  setDeleteId: React.Dispatch<React.SetStateAction<string | null>>;
  // Expanded row
  expandedRowId: string | null;
  setExpandedRowId: (id: string | null) => void;
  // Refs
  containerRef: React.RefObject<HTMLDivElement>;
  expandedRowRef: React.RefObject<HTMLTableRowElement>;
  expandedCollapseRef: React.RefObject<HTMLDivElement>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useDataTable<TFilters extends object, FID extends string = string>(
  options: UseDataTableOptions<TFilters, FID>,
): UseDataTableReturn<TFilters, FID> {
  const {
    tableName,
    defaultFilters,
    allFilterGroupIds,
    layoutWidth: layoutWidthProp = 'full',
    isSection = false,
    externalViewMode,
    onExternalViewModeChange,
    externalExpandedRowId,
    manageExpandedRowId = false,
    expandedItem,
    onCloseDetails,
  } = options;

  const layoutWidth = layoutWidthProp === 'auto' ? 'full' : layoutWidthProp;

  // ── View mode ──────────────────────────────────────────────────────────────
  const { viewMode: persistedViewMode, setViewMode: setPersistedViewMode } = useViewMode(tableName);

  const viewMode = externalViewMode ?? persistedViewMode;
  const setViewMode = onExternalViewModeChange ?? setPersistedViewMode;

  // ── Items per page ─────────────────────────────────────────────────────────
  const itemsPerPage = useDataTableItemsPerPage(viewMode, layoutWidth, isSection);

  // ── Pagination state ───────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = React.useState(1);

  // ── Filters state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = React.useState<TFilters>(defaultFilters);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showConfigure, setShowConfigure] = React.useState(false);

  const clearFilters = React.useCallback(() => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  }, [defaultFilters]);

  // ── Delete state ───────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // ── Expanded row state ─────────────────────────────────────────────────────
  const [internalExpandedRowId, setInternalExpandedRowId] = React.useState<string | null>(null);

  const expandedRowId = manageExpandedRowId
    ? internalExpandedRowId
    : (externalExpandedRowId ?? null);

  const setExpandedRowId = React.useCallback(
    (id: string | null) => {
      if (manageExpandedRowId) {
        setInternalExpandedRowId(id);
      }
    },
    [manageExpandedRowId],
  );

  // ── RBAC + Préférences / filterVisibility ────────────────────────────────
  const {
    filterVisibility,
    visibleFilterIds,
    allowedFilterIds,
    handleToggleFilterVisibility,
    isSavingFilterVisibility,
    interfaceElements,
  } = useFilterVisibility<FID>({
    preferencesName: tableName,
    elementsName: tableName,
    allFilterGroupIds,
  });

  // ── Refs ───────────────────────────────────────────────────────────────────
  const containerRef = React.useRef<HTMLDivElement>(null);
  const expandedRowRef = React.useRef<HTMLTableRowElement>(null);
  const expandedCollapseRef = React.useRef<HTMLDivElement>(null);

  // ── Scroll to top on page change ───────────────────────────────────────────
  const prevPageRef = React.useRef(currentPage);
  React.useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      prevPageRef.current = currentPage;
    }
  }, [currentPage]);

  // ── Scroll to expanded row on expand ──────────────────────────────────────
  const prevExpandedRowIdRef = React.useRef(expandedRowId);
  React.useEffect(() => {
    if (prevExpandedRowIdRef.current !== expandedRowId && expandedRowId) {
      const scrollToCollapse = () => {
        const targetElement = expandedCollapseRef.current || expandedRowRef.current;
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          setTimeout(scrollToCollapse, 100);
        }
      };
      setTimeout(scrollToCollapse, 300);
    }
    prevExpandedRowIdRef.current = expandedRowId;
    // expandedItem est intentionnellement inclus : quand l'item résolu arrive (query async),
    // on re-tente le scroll si la ref est désormais disponible.
  }, [expandedRowId, expandedItem]);

  // ── handleViewModeChange avec recalcul de page ────────────────────────────
  const handleViewModeChange = React.useCallback(
    (mode: ViewMode) => {
      if (mode === viewMode) return;
      const prevPerPage = resolveDataTableItemsPerPage(viewMode, layoutWidth, isSection);
      const newPerPage = resolveDataTableItemsPerPage(mode, layoutWidth, isSection);
      const firstItemIndex = (currentPage - 1) * prevPerPage;
      const newPage = Math.max(1, Math.floor(firstItemIndex / newPerPage) + 1);
      setCurrentPage(newPage);
      onCloseDetails?.();
      setViewMode(mode);
    },
    [viewMode, layoutWidth, isSection, currentPage, setViewMode, onCloseDetails],
  );

  return {
    viewMode,
    handleViewModeChange,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    filters,
    setFilters,
    clearFilters,
    showFilters,
    setShowFilters,
    showConfigure,
    setShowConfigure,
    filterVisibility,
    visibleFilterIds,
    handleToggleFilterVisibility,
    isSavingFilterVisibility,
    allowedFilterIds,
    interfaceElements,
    deleteId,
    setDeleteId,
    expandedRowId,
    setExpandedRowId,
    containerRef,
    expandedRowRef,
    expandedCollapseRef,
  };
}
