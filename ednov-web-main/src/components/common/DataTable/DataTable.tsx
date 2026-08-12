import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { ViewToggle } from '@/components/common/ViewToggle';
import { DataTablePagination } from './DataTablePagination';
import { DetailsViewModal } from '@/components/common/details/DetailsViewModal';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/types/data-table.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DataTableProps<T extends { id: string }> {
  // Données
  data: T[];
  totalItems: number;
  isLoading: boolean;

  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showViewToggle?: boolean;

  // Pagination
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  hasActiveFilters: boolean;

  // Toolbar (Filter btn + Create btn + Export btn)
  toolbarActions?: React.ReactNode;

  // Panel filtres slot
  filtersPanel?: React.ReactNode;

  // Mode liste
  renderTableHead: () => React.ReactNode;
  /**
   * Doit retourner le contenu de la ligne (<td>…</td> via XxxRow).
   * Le <tr> avec classes et ref est géré par DataTable.
   */
  renderTableRow: (item: T, index: number) => React.ReactNode;
  expandedRowId?: string | null;
  renderExpandedRow?: (item: T) => React.ReactNode;
  /** Nombre de colonnes pour le colSpan du collapse. Défaut : 6 */
  expandedColSpan?: number;
  expandedRowRef?: React.RefObject<HTMLTableRowElement>;
  expandedCollapseRef?: React.RefObject<HTMLDivElement>;

  // Mode cartes
  renderCard: (item: T, index: number) => React.ReactNode;

  // État vide
  emptyIcon: LucideIcon;
  emptyText: string;

  /**
   * Item résolu pour la ligne/modal détail.
   * Mode liste : si non présent dans data, affiché comme ligne séparée.
   * Mode cartes : affiché dans DetailsViewModal.
   */
  expandedItem?: T | null;
  onCloseDetails?: () => void;
  renderDetailsContent?: (item: T) => React.ReactNode;
  /** Ouvre le panneau détail (ex. pendant le chargement du CR avant `expandedItem`). */
  isDetailsPanelOpen?: boolean;
  /** Contenu détail sans item résolu (prioritaire sur `renderDetailsContent`). */
  renderDetailsPanel?: () => React.ReactNode;

  // Slot modals (DeleteModal, CancelModal, AttendanceModal, …)
  modals?: React.ReactNode;

  containerRef?: React.RefObject<HTMLDivElement>;
  className?: string;

  /**
   * Titre de la section — affiché uniquement quand isSection=true (vue dashboard).
   * Masqué en management page (le PageHeader fait office de titre).
   */
  title?: string;
  isSection?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export const DataTable = <T extends { id: string }>({
  data,
  totalItems,
  isLoading,
  viewMode,
  onViewModeChange,
  showViewToggle = true,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  itemLabel,
  onPageChange,
  hasActiveFilters,
  toolbarActions,
  filtersPanel,
  renderTableHead,
  renderTableRow,
  expandedRowId,
  renderExpandedRow,
  expandedColSpan = 6,
  expandedRowRef,
  expandedCollapseRef,
  renderCard,
  emptyIcon: EmptyIcon,
  emptyText,
  expandedItem,
  onCloseDetails,
  renderDetailsContent,
  isDetailsPanelOpen,
  renderDetailsPanel,
  modals,
  containerRef,
  className,
  title,
  isSection = false,
}: DataTableProps<T>) => {
  // L'item expanded off-page (pas dans data) pour la ligne séparée en mode liste
  const offPageExpandedItem =
    expandedItem && !data.some((item) => item.id === expandedItem.id) ? expandedItem : null;

  const detailsOpen = isDetailsPanelOpen ?? !!expandedItem;
  const detailsBody =
    renderDetailsPanel?.() ??
    (expandedItem && renderDetailsContent ? renderDetailsContent(expandedItem) : null);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* ── Toolbar / Section header ── */}
      {(isSection && title ? true : toolbarActions || showViewToggle) && (
        <div
          className={isSection && title ? 'section-header' : 'flex items-center justify-end gap-2'}
        >
          {isSection && title && <h2 className="section-title">{title}</h2>}
          {(toolbarActions || showViewToggle) && (
            <div className="section-actions">
              {toolbarActions}
              {showViewToggle && <ViewToggle mode={viewMode} onChange={onViewModeChange} />}
            </div>
          )}
        </div>
      )}

      {/* ── Filtres ── */}
      {filtersPanel}

      {/* ── Contenu + Pagination ── */}
      <div ref={containerRef}>
        {viewMode === 'list' ? (
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>{renderTableHead()}</thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={expandedColSpan}>
                        <div className="table-empty">
                          <Spinner size="lg" label="Chargement..." />
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isLoading && data.length === 0 && (
                    <tr>
                      <td colSpan={expandedColSpan}>
                        <div className="table-empty">
                          <EmptyIcon className="table-empty-icon" />
                          <p className="table-empty-text">{emptyText}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isLoading &&
                    data.map((item, index) => (
                      <React.Fragment key={item.id}>
                        <tr
                          className="group animate-fade-in animate-stagger"
                          style={{ animationDelay: `${index * 50}ms` }}
                          ref={expandedRowId === item.id ? expandedRowRef : null}
                        >
                          {renderTableRow(item, index)}
                        </tr>
                        {expandedRowId === item.id && renderExpandedRow && (
                          <tr className="table-row-expanded">
                            <td colSpan={expandedColSpan} className="p-0">
                              <div ref={expandedCollapseRef} className="table-row-collapse-content">
                                {renderExpandedRow(item)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  {/* Ligne pour l'item expanded non présent dans la page courante */}
                  {!isLoading && offPageExpandedItem && (
                    <>
                      <tr ref={expandedRowRef} className="group">
                        {renderTableRow(offPageExpandedItem, -1)}
                      </tr>
                      {renderExpandedRow && (
                        <tr className="table-row-expanded">
                          <td colSpan={expandedColSpan} className="p-0">
                            <div ref={expandedCollapseRef} className="table-row-collapse-content">
                              {renderExpandedRow(offPageExpandedItem)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination à l'intérieur du table-container (border-top intégré) */}
            {(totalItems > 0 || hasActiveFilters) && (
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                itemLabel={itemLabel}
                onPageChange={onPageChange}
              />
            )}
          </div>
        ) : (
          <>
            <div className="table-container">
              <div className="data-cards-grid-wrapper">
                <div className="data-cards-grid">
                  {isLoading && (
                    <div className="col-span-full text-center p-8">
                      <Spinner size="lg" label="Chargement..." />
                    </div>
                  )}
                  {!isLoading && data.length === 0 && (
                    <div className="col-span-full">
                      <div className="table-empty">
                        <EmptyIcon className="table-empty-icon" />
                        <p className="table-empty-text">{emptyText}</p>
                      </div>
                    </div>
                  )}
                  {!isLoading &&
                    data.length > 0 &&
                    data.map((item, index) => (
                      <div
                        key={item.id}
                        className="animate-fade-in animate-stagger"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {renderCard(item, index)}
                      </div>
                    ))}
                </div>
              </div>
            </div>
            {/* Pagination en mode cartes */}
            {(totalItems > 0 || hasActiveFilters) && (
              <div className="mt-5">
                <DataTablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  itemLabel={itemLabel}
                  onPageChange={onPageChange}
                />
              </div>
            )}
            {/* DetailsViewModal en mode cartes */}
            {detailsOpen && onCloseDetails && detailsBody && (
              <DetailsViewModal isOpen={true} onClose={onCloseDetails}>
                {detailsBody}
              </DetailsViewModal>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {modals}
    </div>
  );
};
