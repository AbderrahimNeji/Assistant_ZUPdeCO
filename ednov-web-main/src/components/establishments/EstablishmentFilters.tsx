import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/forms/Button';
import { Input } from '@/components/forms/Input';
import { MultiSelect } from '@/components/forms/MultiSelect';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { useCoordinatorsAutocomplete } from '@/hooks/useCoordinatorsAutocomplete';
import { useManagersAutocomplete } from '@/hooks/useManagersAutocomplete';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import { ESTABLISHMENT_SEARCH_HINT } from '@/utils/formatEstablishmentSelectLabel';
import { getEstablishment } from '@/services/establishments.service';
import { getSpecialties } from '@/services/specialties.service';
import {
  ESTABLISHMENT_CATEGORY_CONFIG,
  ESTABLISHMENT_PRIORITY_NETWORK_CONFIG,
  ESTABLISHMENT_TYPE_CONFIG,
  ESTABLISHMENT_STATUS_CONFIG,
  type EstablishmentFilters,
} from './establishment-configs';
import type {
  EstablishmentCategory,
  EstablishmentPriorityNetwork,
  EstablishmentStatus,
  EstablishmentType,
} from '@/types/establishment.types';

interface EstablishmentFiltersContentProps {
  filters: EstablishmentFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleType: (type: string) => void;
  onToggleCategory?: (category: string) => void;
  onTogglePriorityNetwork?: (network: string) => void;
  onToggleStatus: (status: string) => void;
  onSetCity?: (city: string | undefined) => void;
  onSetDepartment?: (dept: string | undefined) => void;
  onSetCalendarType?: (type: string | undefined) => void;
  onToggleQpv?: (val: boolean | null) => void;
  onSetSearchQuery?: (query: string) => void;
  onSetQuotaRange?: (min: number | undefined, max: number | undefined) => void;
  onSetEstablishment?: (id: string | undefined, name?: string) => void;
  onSetCustomDateRange?: (from: Date | undefined, to: Date | undefined) => void;
  onSetCoordinator?: (id: string | undefined) => void;
  onSetManager?: (id: string | undefined) => void;
  onSetSpecialties?: (ids: string[]) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

const TypeFilter: React.FC<{
  filters: EstablishmentFilters;
  onToggleType: (type: string) => void;
}> = ({ filters, onToggleType }) => (
  <div className="filter-group">
    <span className="filter-group-label">Type</span>
    <div className="filter-options">
      {Object.entries(ESTABLISHMENT_TYPE_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        // Keys match EstablishmentType; cast for typed filter arrays (same idea as SessionFilters + string callbacks)
        const typeKey = key as EstablishmentType;
        const isActive = filters.types.includes(typeKey);
        return (
          <Button
            key={key}
            variant="custom"
            size="sm"
            icon={Icon}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              isActive ? 'filter-badge-active' : 'filter-badge-inactive',
            )}
            style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
            onClick={() => onToggleType(key)}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const CategoryFilter: React.FC<{
  filters: EstablishmentFilters;
  onToggleCategory: (category: string) => void;
}> = ({ filters, onToggleCategory }) => (
  <div className="filter-group">
    <span className="filter-group-label">Catégorie</span>
    <div className="filter-options">
      {Object.entries(ESTABLISHMENT_CATEGORY_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        const categoryKey = key as EstablishmentCategory;
        const isActive = (filters.categories ?? []).includes(categoryKey);
        return (
          <Button
            key={key}
            variant="custom"
            size="sm"
            icon={Icon}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              isActive ? 'filter-badge-active' : 'filter-badge-inactive',
            )}
            style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
            onClick={() => onToggleCategory(key)}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const PriorityNetworkFilter: React.FC<{
  filters: EstablishmentFilters;
  onTogglePriorityNetwork: (network: string) => void;
}> = ({ filters, onTogglePriorityNetwork }) => (
  <div className="filter-group">
    <span className="filter-group-label">Réseau prioritaire</span>
    <div className="filter-options">
      {Object.entries(ESTABLISHMENT_PRIORITY_NETWORK_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        const networkKey = key as EstablishmentPriorityNetwork;
        const isActive = (filters.priorityNetworks ?? []).includes(networkKey);
        return (
          <Button
            key={key}
            variant="custom"
            size="sm"
            icon={Icon}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              isActive ? 'filter-badge-active' : 'filter-badge-inactive',
            )}
            style={{ '--filter-color': config.badgeColor } as React.CSSProperties}
            onClick={() => onTogglePriorityNetwork(key)}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const StatusFilter: React.FC<{
  filters: EstablishmentFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(ESTABLISHMENT_STATUS_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        const statusKey = key as EstablishmentStatus;
        const isActive = filters.statuses.includes(statusKey);
        return (
          <Button
            key={key}
            variant="custom"
            size="sm"
            icon={Icon}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              isActive ? 'filter-badge-active' : 'filter-badge-inactive',
            )}
            style={
              {
                '--filter-color': config.badgeColor ?? 'rgb(var(--status-success))',
              } as React.CSSProperties
            }
            onClick={() => onToggleStatus(key)}
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const EstablishmentSearchFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetEstablishment: (id: string | undefined, name?: string) => void;
}> = ({ filters, onSetEstablishment }) => {
  const { options, isLoading, onSearch } = useEstablishmentsAutocomplete();

  const { data: selectedEstablishment } = useQuery({
    queryKey: ['establishment', filters.selectedEstablishmentId],
    queryFn: () => getEstablishment(filters.selectedEstablishmentId!),
    enabled: Boolean(filters.selectedEstablishmentId),
    staleTime: 5 * 60 * 1000,
  });

  const mergedOptions = React.useMemo(() => {
    const id = filters.selectedEstablishmentId;
    if (!id || !selectedEstablishment) return options;
    const exists = options.some((o) => o.value === id);
    if (exists) return options;
    return [{ value: selectedEstablishment.id, label: selectedEstablishment.name }, ...options];
  }, [filters.selectedEstablishmentId, options, selectedEstablishment]);

  const handleChange = (id: string) => {
    if (!id) {
      onSetEstablishment(undefined);
      return;
    }
    const opt = mergedOptions.find((o) => o.value === id);
    // Extrait le nom sans "(Ville - Dept)" ex: "Jules Ferry (Cherbourg - 50)" → "Jules Ferry"
    const name = opt ? opt.label.replace(/\s*\([^)]*\)\s*$/, '').trim() : '';
    onSetEstablishment(id, name);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Établissement</span>
      <div className="w-64">
        <Autocomplete
          placeholder="Rechercher un établissement..."
          options={mergedOptions}
          value={filters.selectedEstablishmentId ?? ''}
          onChange={handleChange}
          onSearch={onSearch}
          isLoading={isLoading}
          minSearchLength={2}
          helperText={ESTABLISHMENT_SEARCH_HINT}
        />
      </div>
    </div>
  );
};

const CitiesFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetCity: (city: string | undefined) => void;
}> = ({ filters, onSetCity }) => {
  const selectedCity = filters.cities?.[0];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Ville</span>
      <div className="w-64">
        <Input
          type="text"
          placeholder="Filtrer par ville..."
          className="text-sm py-1.5 px-3 rounded-lg w-full"
          value={selectedCity ?? ''}
          onChange={(e) => onSetCity(e.target.value || undefined)}
        />
      </div>
    </div>
  );
};

const DepartmentsFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetDepartment: (dept: string | undefined) => void;
}> = ({ filters, onSetDepartment }) => {
  const selectedDept = filters.departments?.[0];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Département</span>
      <div className="w-48">
        <Input
          type="text"
          placeholder="Ex: 75, 93..."
          className="text-sm py-1.5 px-3 rounded-lg w-full"
          value={selectedDept ?? ''}
          onChange={(e) => onSetDepartment(e.target.value || undefined)}
        />
      </div>
    </div>
  );
};

const CalendarTypeFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetCalendarType: (type: string | undefined) => void;
}> = ({ filters, onSetCalendarType }) => {
  const CALENDAR_TYPES = [
    { value: 'zone_a', label: 'Zone A' },
    { value: 'zone_b', label: 'Zone B' },
    { value: 'zone_c', label: 'Zone C' },
  ];

  const selectedType = filters.calendarTypes?.[0];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Calendrier</span>
      <div className="filter-options">
        {CALENDAR_TYPES.map((cal) => {
          const isActive = selectedType === cal.value;
          return (
            <Button
              key={cal.value}
              variant="custom"
              size="sm"
              icon={CalendarIcon}
              iconPosition="left"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                isActive ? 'filter-option-primary--active' : 'filter-option-primary',
              )}
              onClick={() => onSetCalendarType(isActive ? undefined : cal.value)}
            >
              {cal.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const QpvFilter: React.FC<{
  filters: EstablishmentFilters;
  onToggleQpv: (val: boolean | null) => void;
}> = ({ filters, onToggleQpv }) => {
  const options: { label: string; value: boolean }[] = [
    { label: 'Oui', value: true },
    { label: 'Non', value: false },
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">QPV</span>
      <div className="filter-options">
        {options.map((opt) => {
          const isActive = filters.isQpv === opt.value;
          return (
            <Button
              key={String(opt.value)}
              variant="custom"
              size="sm"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                isActive ? 'filter-badge-active' : 'filter-badge-inactive',
              )}
              onClick={() => onToggleQpv(isActive ? null : opt.value)}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const DateCreationFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetCustomDateRange }) => {
  const toDateString = (d?: Date) => {
    if (!d) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fromStr = toDateString(filters.createdFrom);
  const toStr = toDateString(filters.createdTo);

  const handleFromChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(undefined, filters.createdTo);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0);
    onSetCustomDateRange(d, filters.createdTo);
  };

  const handleToChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(filters.createdFrom, undefined);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59, 999);
    onSetCustomDateRange(filters.createdFrom, d);
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Date de création</span>
      <div className="w-auto">
        <DateRangeInput
          startDate={fromStr}
          endDate={toStr}
          onStartDateChange={handleFromChange}
          onEndDateChange={handleToChange}
          layout="horizontal"
          showConnector={true}
          showPresets={false}
          hidePickerLabels={true}
          compact={true}
        />
      </div>
    </div>
  );
};

const CoordinatorFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetCoordinator: (id: string | undefined) => void;
}> = ({ filters, onSetCoordinator }) => {
  const { options, isLoading, onSearch } = useCoordinatorsAutocomplete();

  return (
    <div className="filter-group">
      <span className="filter-group-label">Géré par (Coordinateur)</span>
      <div className="w-64">
        <Autocomplete
          placeholder="Rechercher un coordinateur..."
          options={options}
          value={filters.coordinatorId ?? ''}
          onChange={(val) => onSetCoordinator(val || undefined)}
          onSearch={onSearch}
          isLoading={isLoading}
          minSearchLength={2}
        />
      </div>
    </div>
  );
};

const ManagerFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetManager: (id: string | undefined) => void;
}> = ({ filters, onSetManager }) => {
  const { options, isLoading, onSearch } = useManagersAutocomplete();

  return (
    <div className="filter-group">
      <span className="filter-group-label">Géré par</span>
      <div className="w-64">
        <Autocomplete
          placeholder="Rechercher un manager..."
          options={options}
          value={filters.managedById ?? ''}
          onChange={(val) => onSetManager(val || undefined)}
          onSearch={onSearch}
          isLoading={isLoading}
          minSearchLength={2}
        />
      </div>
    </div>
  );
};

const SpecialtyFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetSpecialties: (ids: string[]) => void;
}> = ({ filters, onSetSpecialties }) => {
  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties', 'active'],
    queryFn: () => getSpecialties(true),
    staleTime: 10 * 60 * 1000,
  });

  const options = specialties.map((s) => ({ value: s.id, label: s.label }));

  return (
    <div className="filter-group">
      <span className="filter-group-label">Spécialités</span>
      <div className="w-64">
        <MultiSelect
          options={options}
          value={filters.specialtyIds ?? []}
          onChange={onSetSpecialties}
          placeholder="Filtrer par spécialité..."
        />
      </div>
    </div>
  );
};

const SearchFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetSearchQuery: (query: string) => void;
}> = ({ filters, onSetSearchQuery }) => (
  <div className="filter-group">
    <span className="filter-group-label">Recherche</span>
    <div className="w-64">
      <Input
        type="text"
        placeholder="Rechercher..."
        className="text-sm py-1.5 px-3 rounded-lg w-full"
        value={filters.searchQuery ?? ''}
        onChange={(e) => onSetSearchQuery(e.target.value)}
      />
    </div>
  </div>
);

const QuotasFilter: React.FC<{
  filters: EstablishmentFilters;
  onSetQuotaRange: (min: number | undefined, max: number | undefined) => void;
}> = ({ filters, onSetQuotaRange }) => (
  <div className="filter-group">
    <span className="filter-group-label">Quotas</span>
    <div className="flex items-center gap-2">
      <Input
        type="number"
        placeholder="Min"
        className="text-sm py-1.5 px-3 rounded-lg w-24"
        value={filters.quotaMin ?? ''}
        onChange={(e) =>
          onSetQuotaRange(e.target.value ? Number(e.target.value) : undefined, filters.quotaMax)
        }
      />
      <span className="text-sm text-muted-foreground">—</span>
      <Input
        type="number"
        placeholder="Max"
        className="text-sm py-1.5 px-3 rounded-lg w-24"
        value={filters.quotaMax ?? ''}
        onChange={(e) =>
          onSetQuotaRange(filters.quotaMin, e.target.value ? Number(e.target.value) : undefined)
        }
      />
    </div>
  </div>
);

export const EstablishmentFiltersContent: React.FC<EstablishmentFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleType,
  onToggleCategory,
  onTogglePriorityNetwork,
  onToggleStatus,
  onSetCity,
  onSetDepartment,
  onSetCalendarType,
  onToggleQpv,
  onSetSearchQuery,
  onSetQuotaRange,
  onSetEstablishment,
  onSetCustomDateRange,
  onSetCoordinator,
  onSetManager,
  onSetSpecialties,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('establishment-search') && onSetEstablishment && (
        <EstablishmentSearchFilter filters={filters} onSetEstablishment={onSetEstablishment} />
      )}
      {show('establishment-types') && <TypeFilter filters={filters} onToggleType={onToggleType} />}
      {show('establishment-categories') && onToggleCategory && (
        <CategoryFilter filters={filters} onToggleCategory={onToggleCategory} />
      )}
      {show('establishment-priority-networks') && onTogglePriorityNetwork && (
        <PriorityNetworkFilter
          filters={filters}
          onTogglePriorityNetwork={onTogglePriorityNetwork}
        />
      )}
      {show('establishment-qpv') && onToggleQpv && (
        <QpvFilter filters={filters} onToggleQpv={onToggleQpv} />
      )}
      {show('establishment-statuses') && (
        <StatusFilter filters={filters} onToggleStatus={onToggleStatus} />
      )}
      {show('establishment-cities') && onSetCity && (
        <CitiesFilter filters={filters} onSetCity={onSetCity} />
      )}
      {show('establishment-departments') && onSetDepartment && (
        <DepartmentsFilter filters={filters} onSetDepartment={onSetDepartment} />
      )}
      {show('establishment-calendar') && onSetCalendarType && (
        <CalendarTypeFilter filters={filters} onSetCalendarType={onSetCalendarType} />
      )}
      {show('establishment-search') && onSetSearchQuery && (
        <SearchFilter filters={filters} onSetSearchQuery={onSetSearchQuery} />
      )}
      {show('establishment-quotas') && onSetQuotaRange && (
        <QuotasFilter filters={filters} onSetQuotaRange={onSetQuotaRange} />
      )}
      {show('filter-managed-by') && onSetManager && (
        <ManagerFilter filters={filters} onSetManager={onSetManager} />
      )}
      {show('establishment-dates') && onSetCustomDateRange && (
        <DateCreationFilter filters={filters} onSetCustomDateRange={onSetCustomDateRange} />
      )}
      {show('establishment-specialties') && onSetSpecialties && (
        <SpecialtyFilter filters={filters} onSetSpecialties={onSetSpecialties} />
      )}
    </div>
  );
};
