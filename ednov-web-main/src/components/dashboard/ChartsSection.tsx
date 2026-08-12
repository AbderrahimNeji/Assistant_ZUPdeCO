import * as React from 'react';
import { ModernChart } from '@/components/charts/ModernChart';
import { useDashboardCharts } from '@/hooks/useDashboardCharts';
import { DashboardStatsFilters } from '@/components/dashboard/DashboardStatsFilters';
import {
  DEFAULT_DASHBOARD_STATS_DATE_FILTERS,
  buildDashboardStatsDateQuery,
  type DashboardStatsDateFilterState,
} from '@/lib/dashboard-stats-date-range';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const ChartsSection: React.FC = () => {
  const [dateFilters, setDateFilters] = React.useState<DashboardStatsDateFilterState>(
    DEFAULT_DASHBOARD_STATS_DATE_FILTERS,
  );
  const [sessionStatusFilter, setSessionStatusFilter] = React.useState<string>('all');

  const chartsApiQuery = React.useMemo(
    () => buildDashboardStatsDateQuery(dateFilters),
    [dateFilters],
  );

  const { data: chartsData, isLoading } = useDashboardCharts(chartsApiQuery);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardStatsFilters filters={dateFilters} onChange={setDateFilters} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!chartsData) {
    return null;
  }

  // Filtrer les séances par statut si un filtre est sélectionné
  const getFilteredSessionsData = () => {
    if (!chartsData.sessionsByEstablishment) {
      return { categories: [], series: [] };
    }

    if (sessionStatusFilter === 'all') {
      return chartsData.sessionsByEstablishment;
    }

    const filteredSeries = chartsData.sessionsByEstablishment.series.filter((s: any) => {
      const statusMap: Record<string, string> = {
        PLANNED: 'Planifiées',
        IN_PROGRESS: 'En cours',
        COMPLETED: 'Terminées',
        CLOSED: 'Clôturées',
        CANCELLED: 'Annulées',
      };
      return s.name === statusMap[sessionStatusFilter];
    });

    return {
      ...chartsData.sessionsByEstablishment,
      series: filteredSeries,
    };
  };

  const sessionsData = getFilteredSessionsData();
  const hasSessionsData = sessionsData.categories.length > 0;
  const hasResourcesData = chartsData.resourcesByEstablishment?.categories?.length > 0;

  return (
    <div className="space-y-6">
      <DashboardStatsFilters filters={dateFilters} onChange={setDateFilters} />

      <div className="grid grid-cols-1 gap-6">
        {/* Séances par établissement avec filtre de statut */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">
              Séances par établissement
            </h3>
            <Select value={sessionStatusFilter} onValueChange={setSessionStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="PLANNED">Planifiées</SelectItem>
                <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminées</SelectItem>
                <SelectItem value="CLOSED">Clôturées</SelectItem>
                <SelectItem value="CANCELLED">Annulées</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-lg">
            {hasSessionsData ? (
              <ModernChart
                type="line"
                title=""
                data={{
                  categories: sessionsData.categories,
                  series: sessionsData.series,
                }}
                height={350}
              />
            ) : (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">Aucune donnée disponible</p>
                  <p className="text-sm mt-2">
                    Sélectionnez un ou plusieurs établissements pour afficher les données
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Graphique consolidé des ressources */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">
            Ressources par établissement
          </h3>
          <div className="rounded-xl border bg-card p-6 shadow-lg">
            {hasResourcesData ? (
              <ModernChart
                type="line"
                title=""
                data={{
                  categories: chartsData.resourcesByEstablishment.categories,
                  series: chartsData.resourcesByEstablishment.series,
                }}
                height={400}
              />
            ) : (
              <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">Aucune donnée disponible</p>
                  <p className="text-sm mt-2">
                    Sélectionnez un ou plusieurs établissements pour afficher les données
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
