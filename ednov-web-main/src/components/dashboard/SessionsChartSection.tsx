import * as React from 'react';
import { Filter, TrendingUp } from 'lucide-react';
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
// ─── Status color map (linked to SESSION_STATUS_CONFIG) ───────────────────────

const STATUS_SERIES_COLORS: Record<string, string> = {
  Planifiées: 'rgb(61, 107, 168)',
  'En cours': 'rgba(var(--color-error), 0.7)',
  Terminées: 'rgba(var(--color-success), 0.8)',
  Clôturées: 'rgba(var(--accent-purple), 0.65)',
  Annulées: 'rgba(var(--color-error), 0.3)',
};

// Maps API key → French series name used by the backend
const STATUS_KEY_TO_SERIES: Record<string, string> = {
  PLANNED: 'Planifiées',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminées',
  CLOSED: 'Clôturées',
  CANCELLED: 'Annulées',
};

const ALL_STATUS_KEYS = Object.keys(STATUS_KEY_TO_SERIES);

// ─── Component ────────────────────────────────────────────────────────────────

export const SessionsChartSection: React.FC = () => {
  const [dateFilters, setDateFilters] = React.useState<DashboardStatsDateFilterState>(
    DEFAULT_DASHBOARD_STATS_DATE_FILTERS,
  );
  const [sessionStatusFilter, setSessionStatusFilter] = React.useState<string[]>(ALL_STATUS_KEYS);
  const [showFilters, setShowFilters] = React.useState(false);

  const chartsApiQuery = React.useMemo(
    () => buildDashboardStatsDateQuery(dateFilters),
    [dateFilters],
  );

  const { data: chartsData, isLoading, isError } = useDashboardCharts(chartsApiQuery);

  const handleToggleStatus = (status: string) => {
    setSessionStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  // ── Derive chart data: backend already returns top-N sorted; only filter displayed series ──
  const { chartData, displayCount } = React.useMemo(() => {
    const raw: BarChartData | null = chartsData?.sessionsByEstablishment ?? null;

    if (!raw || raw.categories.length === 0) {
      return { chartData: null, displayCount: 0 };
    }

    const allowed = new Set(
      sessionStatusFilter.map((k) => STATUS_KEY_TO_SERIES[k]).filter(Boolean),
    );
    const filtered: BarChartData = {
      categories: raw.categories,
      series: raw.series.filter((s) => allowed.has(s.name)),
    };

    return { chartData: filtered, displayCount: filtered.categories.length };
  }, [chartsData, sessionStatusFilter]);

  const hasData =
    chartData !== null &&
    chartData.categories.length > 0 &&
    chartData.series.some((s) => s.data.some((v) => v > 0));

  const chartTitle =
    displayCount > 0
      ? `${displayCount} établissement${displayCount > 1 ? 's' : ''}`
      : 'Séances par établissement';

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
            <TrendingUp className="w-5 h-5 text-[var(--color-1-nuance-1)]" />
            <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">
              Séances par établissement
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
        <SectionHeader
          title={`Séances par établissements`}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
        />
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
          <TrendingUp className="w-5 h-5 text-[var(--color-1-nuance-1)]" />
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">
              Séances par établissement
            </h3>
            {displayCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {chartTitle} · par total de séances
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
            showStatusFilter
            showComparisonFilter={false}
            sessionStatuses={sessionStatusFilter}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      )}

      {/* Chart or empty state */}
      {!hasData ? (
        <EmptyState
          height={chartHeight}
          message="Aucune séance pour ces critères"
          hint="Modifiez la période ou les filtres de statut"
        />
      ) : (
        <HorizontalStackedBarChart
          data={chartData as BarChartData}
          height={chartHeight}
          seriesColors={STATUS_SERIES_COLORS}
        />
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  title: string;
  showFilters: boolean;
  onToggleFilters: () => void;
}> = ({ title, showFilters, onToggleFilters }) => (
  <div className="section-header">
    <div className="flex items-center gap-2">
      <TrendingUp className="w-5 h-5 text-[var(--color-1-nuance-1)]" />
      <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">{title}</h3>
    </div>
    <div className="section-actions">
      <Button
        preset="section-action"
        icon={Filter}
        onClick={onToggleFilters}
        className={cn(showFilters && 'section-action-button-active')}
        tooltipText="Filtrer"
      />
    </div>
  </div>
);

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
