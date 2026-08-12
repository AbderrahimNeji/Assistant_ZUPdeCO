import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/forms/Button';
import { Select } from '@/components/forms/Select';
import { DateRangeInput } from '@/components/forms/DateRangeInput';
import { VOLUNTEER_STATUS_CONFIG } from './volunteer-configs';
import type { VolunteerFilters } from './volunteer-configs';
import { getSubjects } from '@/services/academic.service';
import { Autocomplete } from '@/components/forms/Autocomplete';
import { useEstablishmentsAutocomplete } from '@/hooks/useEstablishmentsAutocomplete';
import type { Subject } from '@/types/subject.types';
import { getEstablishment } from '@/services/establishments.service';
import { formatEstablishmentSelectLabel } from '@/utils/formatEstablishmentSelectLabel';

interface VolunteerFiltersContentProps {
  filters: VolunteerFilters;
  allowedFilterIds: string[];
  visibleFilterIds: string[];
  onToggleStatus: (status: string) => void;
  onSetSubject: (id: string | undefined) => void;
  onToggleAvailability: (day: string) => void;
  onSetEstablishment: (id: string | undefined) => void;
  onSetDateRange: (range: VolunteerFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
  onSetEntryDateRange?: (from: string | undefined, to: string | undefined) => void;
  onSetEngagementStartDateRange?: (from: string | undefined, to: string | undefined) => void;
  onSetExitDateRange?: (from: string | undefined, to: string | undefined) => void;
  onSetExitReason?: (reason: string | undefined) => void;
}

function isVisible(
  filterId: string,
  allowedFilterIds: string[],
  visibleFilterIds: string[],
): boolean {
  return allowedFilterIds.includes(filterId) && visibleFilterIds.includes(filterId);
}

// ─── Sub-components for each filter group ──────────────────────────────────────

const StatutFilter: React.FC<{
  filters: VolunteerFilters;
  onToggleStatus: (status: string) => void;
}> = ({ filters, onToggleStatus }) => (
  <div className="filter-group">
    <span className="filter-group-label">Statut</span>
    <div className="filter-options">
      {Object.entries(VOLUNTEER_STATUS_CONFIG).map(([key, config]) => {
        const Icon = config.icon;
        const isActive = filters.statuses.includes(key);
        return (
          <Button
            key={key}
            variant="custom"
            size="sm"
            icon={Icon}
            iconPosition="left"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
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

const MatiereFilter: React.FC<{
  filters: VolunteerFilters;
  onSetSubject: (id: string | undefined) => void;
  enabled: boolean;
}> = ({ filters, onSetSubject, enabled }) => {
  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects', 'volunteer-filters'],
    queryFn: async () => {
      const response = await getSubjects({ page: 1, pageSize: 100 });
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const selectOptions = [
    { value: '', label: 'Toutes' },
    ...subjects.map((s) => ({ value: s.id, label: s.label })),
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Matière</span>
      <Select
        options={selectOptions}
        value={filters.subjects[0] ?? ''}
        onChange={(val) => onSetSubject(val || undefined)}
        disabled={isLoading}
        size="sm"
        className="min-w-36"
      />
    </div>
  );
};

const DisponibiliteFilter: React.FC<{
  filters: VolunteerFilters;
  onToggleAvailability: (day: string) => void;
}> = ({ filters, onToggleAvailability }) => {
  const days = [
    { value: 'monday', label: 'Lun' },
    { value: 'tuesday', label: 'Mar' },
    { value: 'wednesday', label: 'Mer' },
    { value: 'thursday', label: 'Jeu' },
    { value: 'friday', label: 'Ven' },
  ];

  return (
    <div className="filter-group">
      <span className="filter-group-label">Disponibilité</span>
      <div className="filter-options">
        {days.map((day) => {
          const isActive = filters.availability?.includes(day.value) ?? false;
          return (
            <Button
              key={day.value}
              variant="custom"
              size="sm"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                isActive ? 'filter-option-primary--active' : 'filter-option-primary',
              )}
              onClick={() => onToggleAvailability(day.value)}
            >
              {day.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const EtablissementFilter: React.FC<{
  filters: VolunteerFilters;
  onSetEstablishment: (id: string | undefined) => void;
}> = ({ filters, onSetEstablishment }) => {
  const { options, isLoading, onSearch } = useEstablishmentsAutocomplete();

  const { data: selectedEstablishment } = useQuery({
    queryKey: ['establishment', filters.establishmentId],
    queryFn: () => getEstablishment(filters.establishmentId!),
    enabled: Boolean(filters.establishmentId),
    staleTime: 5 * 60 * 1000,
  });

  const mergedOptions = React.useMemo(() => {
    const id = filters.establishmentId;
    if (!id || !selectedEstablishment) return options;
    const exists = options.some((o) => o.value === id);
    if (exists) return options;
    return [
      {
        value: selectedEstablishment.id,
        label: formatEstablishmentSelectLabel(selectedEstablishment),
      },
      ...options,
    ];
  }, [filters.establishmentId, options, selectedEstablishment]);

  return (
    <div className="filter-group">
      <span className="filter-group-label">Établissement</span>
      <div className="w-64">
        <Autocomplete
          placeholder="Rechercher un établissement..."
          options={mergedOptions}
          value={filters.establishmentId ?? ''}
          onChange={(val) => onSetEstablishment(val || undefined)}
          onSearch={onSearch}
          isLoading={isLoading}
          minSearchLength={2}
        />
      </div>
    </div>
  );
};

const DateCreationFilter: React.FC<{
  filters: VolunteerFilters;
  onSetDateRange: (range: VolunteerFilters['dateRange']) => void;
  onSetCustomDateRange: (from: Date | undefined, to: Date | undefined) => void;
}> = ({ filters, onSetDateRange, onSetCustomDateRange }) => {
  const PERIOD_OPTIONS = [
    { value: 'all' as const, label: 'Tout' },
    { value: 'week' as const, label: 'Cette semaine' },
    { value: 'month' as const, label: 'Ce mois' },
    { value: 'year' as const, label: 'Cette année' },
  ];

  const toDateString = (d?: Date) => {
    if (!d) return undefined;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fromStr = toDateString(filters.customDateFrom);
  const toStr = toDateString(filters.customDateTo);

  const handleFromChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(undefined, filters.customDateTo);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0);
    onSetCustomDateRange(d, filters.customDateTo);
    onSetDateRange('all');
  };

  const handleToChange = (val: string) => {
    if (!val) {
      onSetCustomDateRange(filters.customDateFrom, undefined);
      return;
    }
    const [year, month, day] = val.split('-').map(Number);
    const d = new Date(year, month - 1, day, 23, 59, 59);
    onSetCustomDateRange(filters.customDateFrom, d);
    onSetDateRange('all');
  };

  return (
    <div className="filter-group">
      <span className="filter-group-label">Date de création</span>
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg overflow-hidden border border-[var(--color-2-nuance-1)]">
          {PERIOD_OPTIONS.map((option, index) => {
            const isActive = filters.dateRange === option.value && !filters.customDateFrom;
            const isLast = index === PERIOD_OPTIONS.length - 1;
            return (
              <Button
                key={option.value}
                variant="custom"
                size="sm"
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-all border-0',
                  !isLast && 'border-r border-[var(--color-2-nuance-1)]',
                  isActive ? 'session-period-btn--active' : 'session-period-btn',
                )}
                onClick={() => {
                  onSetDateRange(option.value);
                  onSetCustomDateRange(undefined, undefined);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
        {filters.dateRange === 'all' && (
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
        )}
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────

export const VolunteerFiltersContent: React.FC<VolunteerFiltersContentProps> = ({
  filters,
  allowedFilterIds,
  visibleFilterIds,
  onToggleStatus,
  onSetSubject,
  onToggleAvailability,
  onSetEstablishment,
  onSetDateRange,
  onSetCustomDateRange,
  onSetEntryDateRange,
  onSetEngagementStartDateRange,
  onSetExitDateRange,
  onSetExitReason,
}) => {
  const show = (id: string) => isVisible(id, allowedFilterIds, visibleFilterIds);

  return (
    <div className="filter-groups-container">
      {show('filter-statut') && <StatutFilter filters={filters} onToggleStatus={onToggleStatus} />}

      {show('filter-matiere') && (
        <MatiereFilter filters={filters} onSetSubject={onSetSubject} enabled={true} />
      )}

      {show('filter-disponibilite') && (
        <DisponibiliteFilter filters={filters} onToggleAvailability={onToggleAvailability} />
      )}

      {show('filter-etablissement') && (
        <EtablissementFilter filters={filters} onSetEstablishment={onSetEstablishment} />
      )}

      {show('filter-dates') && (
        <DateCreationFilter
          filters={filters}
          onSetDateRange={onSetDateRange}
          onSetCustomDateRange={onSetCustomDateRange}
        />
      )}

      {show('filter-date-entree') && onSetEntryDateRange && (
        <div className="filter-group">
          <span className="filter-group-label">Date d'entrée VSC</span>
          <div className="w-auto">
            <DateRangeInput
              startDate={filters.entryDateFrom}
              endDate={filters.entryDateTo}
              onStartDateChange={(val) =>
                onSetEntryDateRange(val || undefined, filters.entryDateTo)
              }
              onEndDateChange={(val) =>
                onSetEntryDateRange(filters.entryDateFrom, val || undefined)
              }
              layout="horizontal"
              showConnector={true}
              showPresets={false}
              hidePickerLabels={true}
              compact={true}
            />
          </div>
        </div>
      )}

      {show('filter-date-sortie') && onSetExitDateRange && (
        <div className="filter-group">
          <span className="filter-group-label">Date de sortie effective</span>
          <div className="w-auto">
            <DateRangeInput
              startDate={filters.exitDateFrom}
              endDate={filters.exitDateTo}
              onStartDateChange={(val) => onSetExitDateRange(val || undefined, filters.exitDateTo)}
              onEndDateChange={(val) => onSetExitDateRange(filters.exitDateFrom, val || undefined)}
              layout="horizontal"
              showConnector={true}
              showPresets={false}
              hidePickerLabels={true}
              compact={true}
            />
          </div>
        </div>
      )}

      {show('filter-motif-sortie') && onSetExitReason && (
        <div className="filter-group">
          <span className="filter-group-label">Motif de sortie</span>
          <div className="w-64">
            <Select
              key={filters.exitReason ?? '__empty__'}
              options={[
                { value: "Fin d'engagement anticipé", label: "Fin d'engagement anticipé" },
                {
                  value: 'Réaffectation dans une autre zone',
                  label: 'Réaffectation dans une autre zone',
                },
                { value: 'Ne donne pas suite', label: 'Ne donne pas suite' },
                { value: 'Autre', label: 'Autre' },
              ]}
              value={filters.exitReason ?? ''}
              onChange={(val) => onSetExitReason(val || undefined)}
              placeholder="Tous les motifs"
            />
          </div>
        </div>
      )}
    </div>
  );
};
