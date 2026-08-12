import * as React from 'react';
import { Star, Filter, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { DataTable } from '@/components/common/DataTable';
import { DataTableFilters } from '@/components/common/DataTable/DataTableFilters';
import { Button } from '@/components/forms/Button';
import { SpecialtyRow } from './SpecialtyRow';
import { SpecialtyCard } from './SpecialtyCard';
import { SpecialtyFiltersContent } from './SpecialtyFilters';
import { DeleteModal } from '@/components/modals/DeleteModal';
import { useDataTable } from '@/hooks/useDataTable';
import { getSpecialties, deleteSpecialty } from '@/services/specialties.service';
import type { Specialty } from '@/services/specialties.service';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SPECIALTY_FILTERS,
  ALL_FILTER_GROUP_IDS,
  FILTER_GROUP_LABELS,
  type SpecialtyFilters,
  type FilterGroupId,
} from './specialty-configs';
import type { ElementWidth } from '@/types/interface-elements.types';

interface SpecialtiesDataTableProps {
  onEditSpecialty?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
  showCreateButton?: boolean;
  onCreateSpecialty?: () => void;
  layoutWidth?: ElementWidth;
}

export const SpecialtiesDataTable: React.FC<SpecialtiesDataTableProps> = ({
  onEditSpecialty,
  pageActions,
  showCreateButton = false,
  onCreateSpecialty,
  layoutWidth = 'full',
}) => {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = React.useState<Specialty | null>(null);

  const dt = useDataTable<SpecialtyFilters, FilterGroupId>({
    tableName: 'specialties',
    defaultFilters: DEFAULT_SPECIALTY_FILTERS,
    allFilterGroupIds: ALL_FILTER_GROUP_IDS,
    layoutWidth,
    isSection: false,
  });

  const { data: allSpecialties = [], isLoading } = useQuery({
    queryKey: ['specialties', 'all'],
    queryFn: () => getSpecialties(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (specialty: Specialty) => deleteSpecialty(specialty.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
      setDeleteTarget(null);
      toast.success('Spécialité supprimée avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression de la spécialité');
    },
  });

  const filteredData = React.useMemo(() => {
    let data = allSpecialties;
    if (dt.filters.statuses.length > 0) {
      data = data.filter((s) => {
        const key = s.isActive ? 'active' : 'inactive';
        return dt.filters.statuses.includes(key);
      });
    }
    if (dt.filters.searchTerm?.trim()) {
      const term = dt.filters.searchTerm.toLowerCase();
      data = data.filter(
        (s) => s.label.toLowerCase().includes(term) || s.code.toLowerCase().includes(term),
      );
    }
    return data;
  }, [allSpecialties, dt.filters]);

  const hasActiveFilters = React.useMemo(
    () =>
      dt.filters.statuses.length > 0 ||
      (!!dt.filters.searchTerm && dt.filters.searchTerm.length > 0),
    [dt.filters],
  );

  const toggleStatusFilter = React.useCallback(
    (status: string) => {
      dt.setFilters((prev) => ({
        ...prev,
        statuses: prev.statuses.includes(status)
          ? prev.statuses.filter((s) => s !== status)
          : [...prev.statuses, status],
      }));
    },
    [dt],
  );

  const setSearchTerm = React.useCallback(
    (term: string) => {
      dt.setFilters((prev) => ({ ...prev, searchTerm: term || undefined }));
    },
    [dt],
  );

  const filterGroups = React.useMemo(
    () => [
      {
        id: 'filters',
        label: 'Filtres',
        type: 'custom' as const,
        customRender: () => (
          <SpecialtyFiltersContent
            filters={dt.filters}
            allowedFilterIds={dt.allowedFilterIds}
            visibleFilterIds={dt.visibleFilterIds}
            onToggleStatus={toggleStatusFilter}
            onSetSearchTerm={setSearchTerm}
          />
        ),
      },
    ],
    [dt.filters, dt.allowedFilterIds, dt.visibleFilterIds, toggleStatusFilter, setSearchTerm],
  );

  return (
    <DataTable
      data={filteredData}
      totalItems={filteredData.length}
      isLoading={isLoading}
      viewMode={dt.viewMode}
      onViewModeChange={dt.handleViewModeChange}
      currentPage={1}
      totalPages={1}
      startIndex={0}
      endIndex={filteredData.length}
      itemLabel="spécialités"
      onPageChange={() => {}}
      hasActiveFilters={hasActiveFilters}
      containerRef={dt.containerRef}
      toolbarActions={
        <>
          <Button
            preset="toolbar-filter"
            className={cn(dt.showFilters && 'section-action-button-active')}
            showBadge={hasActiveFilters}
            onClick={() => {
              dt.setShowFilters((prev) => {
                if (prev) dt.setShowConfigure(false);
                return !prev;
              });
            }}
          />
          {showCreateButton && onCreateSpecialty && (
            <Button
              preset="toolbar-create"
              tooltipText="Créer une spécialité"
              onClick={onCreateSpecialty}
            />
          )}
        </>
      }
      filtersPanel={
        <DataTableFilters
          show={dt.showFilters}
          hasActiveFilters={hasActiveFilters}
          filterGroups={filterGroups}
          onClearFilters={dt.clearFilters}
          resultCount={filteredData.length}
          resultLabel="spécialité(s)"
          onToggleConfigure={() => dt.setShowConfigure((v) => !v)}
          showConfigure={dt.showConfigure}
          configureContent={
            <div className="flex flex-wrap gap-2">
              {ALL_FILTER_GROUP_IDS.filter((id) => dt.allowedFilterIds.includes(id)).map((id) => {
                const isOn = dt.filterVisibility[id];
                return (
                  <Button
                    key={id}
                    variant="custom"
                    size="sm"
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-lg border transition-all',
                      isOn
                        ? 'bg-[var(--color-2-nuance-1)] border-[var(--color-2-nuance-1)] text-white'
                        : 'bg-transparent border-[var(--color-1-nuance-3)] text-muted-foreground hover:border-[var(--color-1-nuance-1)]',
                    )}
                    onClick={() => dt.handleToggleFilterVisibility(id)}
                    disabled={dt.isSavingFilterVisibility}
                  >
                    {FILTER_GROUP_LABELS[id]}
                  </Button>
                );
              })}
            </div>
          }
        />
      }
      renderTableHead={() => (
        <tr>
          <th>Code</th>
          <th>Libellé</th>
          <th>Statut</th>
          <th className="w-20 text-center">Actions</th>
        </tr>
      )}
      renderTableRow={(specialty) => (
        <SpecialtyRow
          specialty={specialty}
          onEdit={onEditSpecialty}
          onDelete={(s) => setDeleteTarget(s)}
          pageActions={pageActions}
        />
      )}
      renderCard={(specialty) => (
        <SpecialtyCard
          specialty={specialty}
          onEdit={onEditSpecialty}
          onDelete={(s) => setDeleteTarget(s)}
          pageActions={pageActions}
        />
      )}
      emptyIcon={Star}
      emptyText="Aucune spécialité trouvée"
      title="Spécialités"
      modals={
        <DeleteModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget);
          }}
          itemName={deleteTarget?.label}
          isLoading={deleteMutation.isPending}
          title="Confirmer la suppression"
          description={`Êtes-vous sûr de vouloir supprimer cette spécialité ? Cette action est irréversible.\n\nNotez que vous pouvez également désactiver cette spécialité en cliquant sur « Modifier », puis en décochant le bouton radio « Spécialité active ».`}
          confirmText="Supprimer"
          variant="danger"
        />
      }
    />
  );
};
