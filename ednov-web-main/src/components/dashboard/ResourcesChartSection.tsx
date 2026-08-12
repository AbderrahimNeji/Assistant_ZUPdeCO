import * as React from 'react';
import { Filter, Users } from 'lucide-react';
import {
  HorizontalStackedBarChart,
  type BarChartData,
} from '@/components/charts/HorizontalStackedBarChart';
import { useDashboardCharts } from '@/hooks/useDashboardCharts';
import { DashboardStatsFilters } from '@/components/dashboard/DashboardStatsFilters';
import { Button } from '@/components/forms/Button';
import {
  DEFAULT_DASHBOARD_STATS_DATE_FILTERS,
  buildDashboardStatsDateQuery,
  type DashboardStatsDateFilterState,
} from '@/lib/dashboard-stats-date-range';
import { cn } from '@/lib/utils';

// ─── Color map (same CSS variable palette as SessionsChartSection) ────────────

const RESOURCE_SERIES_COLORS: Record<string, string> = {
  Élèves: 'rgb(61, 107, 168)',
  Tuteurs: 'rgba(var(--color-success), 0.8)',
  Coordinateurs: 'rgba(var(--accent-purple), 0.65)',
  'VSC Actifs': 'rgba(var(--color-error), 0.7)',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ResourcesChartSection: React.FC = () => {
  const [dateFilters, setDateFilters] = React.useState<DashboardStatsDateFilterState>(
    DEFAULT_DASHBOARD_STATS_DATE_FILTERS,
  );
  const [showFilters, setShowFilters] = React.useState(false);

  const chartsApiQuery = React.useMemo(
    () => buildDashboardStatsDateQuery(dateFilters),
    [dateFilters],
  );

  const { data: chartsData, isLoading, isError } = useDashboardCharts(chartsApiQuery);

  // ── Derive chart data: backend already returns top-N sorted ──────────────
  const { chartData, displayCount } = React.useMemo(() => {
    const raw: BarChartData | null = chartsData?.resourcesByEstablishment ?? null;
    if (!raw || raw.categories.length === 0) return { chartData: null, displayCount: 0 };
    return { chartData: raw, displayCount: raw.categories.length };
  }, [chartsData]);

  const hasData =
    chartData !== null &&
    chartData.categories.length > 0 &&
    chartData.series.some((s) => s.data.some((v) => v > 0));

  const chartTitle =
    displayCount > 0
      ? `${displayCount} établissement${displayCount > 1 ? 's' : ''}`
      : 'Ressources par établissement';

  // ── Responsive height: proportional to bar count, capped for readability ─
  const chartHeight =
    displayCount <= 3
      ? Math.max(160, displayCount * 90 + 60)
      : Math.max(320, Math.min(displayCount * 54 + 100, 620));

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-1-nuance-1)]" />
            <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">
              Ressources par établissement
            </h3>
          </div>
        </div>
        <div
          className="rounded-xl border bg-card p-4 shadow-sm animate-pulse"
          style={{ height: chartHeight }}
        />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-4">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-1-nuance-1)]" />
            <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">
              Ressources par établissement
            </h3>
          </div>
          <div className="section-actions">
            <Button
              preset="section-action"
              icon={Filter}
              onClick={() => setShowFilters((v) => !v)}
              className={cn(showFilters && 'section-action-button-active')}
              tooltipText="Filtrer"
            />
          </div>
        </div>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm rounded-xl border bg-card">
          Impossible de charger les données
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--color-1-nuance-1)]" />
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">
              Ressources par établissement
            </h3>
            {displayCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {chartTitle} · par total de ressources
              </p>
            )}
          </div>
        </div>
        <div className="section-actions">
          <Button
            preset="section-action"
            icon={Filter}
            onClick={() => setShowFilters((v) => !v)}
            className={cn(showFilters && 'section-action-button-active')}
            tooltipText="Filtrer"
          />
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="filter-groups-container">
          <DashboardStatsFilters
            filters={dateFilters}
            onChange={setDateFilters}
            showEstablishmentFilter
            showComparisonFilter={false}
          />
        </div>
      )}

      {/* Chart or empty state */}
      {!hasData ? (
        <EmptyState
          height={chartHeight}
          message="Aucune ressource pour ces critères"
          hint="Modifiez la période ou le filtre d'établissement"
        />
      ) : (
        <HorizontalStackedBarChart
          data={chartData as BarChartData}
          height={chartHeight}
          seriesColors={RESOURCE_SERIES_COLORS}
        />
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const EmptyState: React.FC<{ height: number; message: string; hint?: string }> = ({
  height,
  message,
  hint,
}) => (
  <div
    className="flex flex-col items-center justify-center gap-2 text-muted-foreground rounded-xl border bg-card/60"
    style={{ height }}
  >
    <p className="text-sm font-medium">{message}</p>
    {hint && <p className="text-xs opacity-70">{hint}</p>}
  </div>
);
