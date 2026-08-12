import * as React from 'react';
import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useTheme } from '@/hooks/useTheme';

interface ModernChartProps {
  type: 'line' | 'donut';
  title: string;
  data: {
    series?: ApexOptions['series'];
    labels?: string[];
    categories?: string[];
  };
  height?: number;
}

// Resolve a CSS variable to its actual value at runtime
function resolveCssVar(cssVar: string, fallback: string): string {
  try {
    const name = cssVar.replace(/^var\(\s*(--[^)]+)\s*\)$/, '$1');
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  } catch {
    return fallback;
  }
}

function buildOptions(
  type: 'line' | 'donut',
  data: ModernChartProps['data'],
  isDarkMode: boolean,
  height: number,
): ApexOptions {
  const muted = isDarkMode ? '#9CA3AF' : '#6B7280';
  const valueColor = isDarkMode ? '#F3F4F6' : '#111827';
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tooltipTheme: 'dark' | 'light' = isDarkMode ? 'dark' : 'light';

  const colors = [
    resolveCssVar('var(--color-2-nuance-1)', '#3B82F6'),
    resolveCssVar('var(--color-1-nuance-1)', '#8B5CF6'),
    resolveCssVar('var(--color-3-nuance-1)', '#10B981'),
    '#0A8642',
    '#F59E0B',
  ];

  if (type === 'line') {
    return {
      chart: {
        type: 'line',
        height,
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: 'inherit',
        zoom: { enabled: false },
        animations: { enabled: false },
      },
      colors: colors.slice(0, 3),
      stroke: { curve: 'smooth', width: 3 },
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      xaxis: {
        categories: data.categories ?? [],
        labels: { style: { colors: muted } },
      },
      yaxis: { labels: { style: { colors: muted } } },
      tooltip: { theme: tooltipTheme, x: { show: true } },
      legend: { position: 'top', horizontalAlign: 'left', labels: { colors: muted } },
      dataLabels: { enabled: false },
      series: (data.series ?? []) as ApexAxisChartSeries,
    };
  }

  return {
    chart: {
      type: 'donut',
      height,
      background: 'transparent',
      fontFamily: 'inherit',
      animations: { enabled: false },
    },
    colors,
    labels: data.labels ?? [],
    legend: { position: 'bottom', labels: { colors: muted } },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { show: true, fontSize: '16px', color: muted },
            value: { show: true, fontSize: '24px', fontWeight: 'bold', color: valueColor },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              color: muted,
              formatter: (w) =>
                w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString(),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: tooltipTheme },
    series: (data.series ?? []) as number[],
  };
}

type ApexAxisChartSeries = { name?: string; data: number[] }[];

export const ModernChart: React.FC<ModernChartProps> = ({ type, title, data, height = 350 }) => {
  const { isDarkMode } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<ApexCharts | null>(null);
  const [rendered, setRendered] = React.useState(false);

  const hasData =
    type === 'line'
      ? (data.categories?.length ?? 0) > 0
      : (data.labels?.length ?? 0) > 0 || ((data.series as number[] | undefined)?.length ?? 0) > 0;

  // Create/destroy chart instance imperatively — runs after browser paint, not during React render
  React.useEffect(() => {
    if (!containerRef.current || !hasData) {
      // Destroy any existing instance if data was removed
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
        setRendered(false);
      }
      return;
    }

    let alive = true;
    const options = buildOptions(type, data, isDarkMode, height);
    const chart = new ApexCharts(containerRef.current, options);

    chart.render().then(() => {
      if (alive) {
        instanceRef.current = chart;
        setRendered(true);
      }
    });

    return () => {
      alive = false;
      chart.destroy();
      instanceRef.current = null;
      setRendered(false);
    };
    // Re-mount only on type/height changes; data/theme handled by the update effect
  }, [type, height, hasData]);

  // Sync theme & data without re-mounting
  React.useEffect(() => {
    if (!instanceRef.current || !hasData) return;
    const opts = buildOptions(type, data, isDarkMode, height);
    instanceRef.current.updateOptions(opts, false, false, false);
  }, [isDarkMode, data.categories, data.labels, data.series, hasData, type, height]);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm rounded-xl border bg-card/60"
        style={{ height }}
      >
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="text-xl font-semibold text-[var(--color-1-nuance-1)]">{title}</h3>}
      <div className="relative rounded-xl border bg-card p-4 shadow-sm overflow-hidden">
        {!rendered && (
          <div
            className="absolute inset-0 bg-muted/40 animate-pulse"
            style={{ minHeight: height }}
          />
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
};
