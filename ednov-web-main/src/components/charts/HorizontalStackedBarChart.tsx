import * as React from 'react';
import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useTheme } from '@/hooks/useTheme';

export interface BarChartSeries {
  name: string;
  data: number[];
}

export interface BarChartData {
  categories: string[];
  series: BarChartSeries[];
}

interface HorizontalStackedBarChartProps {
  data: BarChartData;
  height?: number;
  /** Couleur par nom de série */
  seriesColors?: Record<string, string>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveCssVar(cssVar: string, fallback: string): string {
  try {
    const name = cssVar.replace(/^var\(\s*(--[^)]+)\s*\)$/, '$1');
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  } catch {
    return fallback;
  }
}

function resolveColor(raw: string): string {
  // "var(--foo)"
  if (/^var\(/.test(raw) && !/^rgb/.test(raw)) {
    return resolveCssVar(raw, '#888');
  }
  // "rgb(var(--foo))"
  const rgbMatch = raw.match(/^rgb\(var\((.+?)\)\)$/);
  if (rgbMatch) {
    const resolved = resolveCssVar(`var(${rgbMatch[1]})`, '128,128,128');
    return `rgb(${resolved})`;
  }
  // "rgba(var(--foo), 0.45)"
  const rgbaMatch = raw.match(/^rgba\(var\((.+?)\),\s*([\d.]+)\)$/);
  if (rgbaMatch) {
    const resolved = resolveCssVar(`var(${rgbaMatch[1]})`, '128,128,128');
    return `rgba(${resolved}, ${rgbaMatch[2]})`;
  }
  return raw;
}

/** Tronquer un nom long pour les axes */
function truncateLabel(name: string, maxLen = 28): string {
  return name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
}

// ─── Chart options builder ───────────────────────────────────────────────────

function buildOptions(
  data: BarChartData,
  isDarkMode: boolean,
  height: number,
  seriesColors: Record<string, string>,
): ApexOptions {
  const muted = isDarkMode ? '#9CA3AF' : '#6B7280';
  const foreground = isDarkMode ? '#F3F4F6' : '#111827';
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipTheme: 'dark' | 'light' = isDarkMode ? 'dark' : 'light';

  // Compute per-establishment totals for data-label annotation
  const totals = data.categories.map((_, idx) =>
    data.series.reduce((sum, s) => sum + (s.data[idx] ?? 0), 0),
  );

  // Resolve series colors in display order
  const colors = data.series.map((s) => {
    const raw = seriesColors[s.name];
    return raw ? resolveColor(raw) : '#888';
  });

  // Ordered so the last series can host the total label
  const totalSeriesIdx = data.series.length - 1;

  return {
    chart: {
      type: 'bar',
      height,
      stacked: true,
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit',
      animations: { enabled: false },
    },
    colors,
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '62%',
        borderRadius: 4,
        borderRadiusWhenStacked: 'last',
        dataLabels: {
          total: {
            enabled: true,
            offsetX: 6,
            style: {
              fontSize: '12px',
              fontWeight: 600,
              color: foreground,
            },
            formatter: (_val: string | undefined, opts?: { dataPointIndex?: number }) => {
              const idx = opts?.dataPointIndex ?? -1;
              return idx >= 0 && totals[idx] > 0 ? totals[idx].toString() : '';
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      // Only show label on the last (visible) series to avoid cluttered numbers
      enabledOnSeries: [totalSeriesIdx],
      formatter: () => '',
    },
    xaxis: {
      labels: {
        style: { colors: muted, fontSize: '12px' },
        formatter: (val: string) => {
          const n = Number(val);
          return Number.isInteger(n) ? n.toString() : val;
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { show: false },
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
      padding: { left: 0, right: 32 },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: muted },
      fontSize: '13px',
      itemMargin: { horizontal: 12, vertical: 4 },
      markers: { size: 8 },
      onItemClick: { toggleDataSeries: false },
      onItemHover: { highlightDataSeries: true },
    },
    tooltip: {
      theme: tooltipTheme,
      shared: true,
      intersect: false,
      y: {
        formatter: (val: number) => `${val} séance${val !== 1 ? 's' : ''}`,
      },
      custom: ({
        series,
        dataPointIndex,
        w,
      }: {
        series: number[][];
        dataPointIndex: number;
        w: { globals: { seriesNames: string[] } };
      }) => {
        const label = data.categories[dataPointIndex] ?? '';
        const total = totals[dataPointIndex];
        const rows = w.globals.seriesNames
          .map((name: string, i: number) => {
            const v = series[i][dataPointIndex];
            if (v === 0) return '';
            const raw = seriesColors[name];
            const color = raw ? resolveColor(raw) : '#888';
            return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
              <span style="flex:1">${name}</span>
              <strong style="margin-left:8px">${v}</strong>
            </div>`;
          })
          .filter(Boolean)
          .join('');

        return `<div style="padding:10px 14px;min-width:180px">
          <div style="font-weight:600;margin-bottom:8px;font-size:13px">${label}</div>
          ${rows}
          <div style="border-top:1px solid rgba(128,128,128,0.2);margin-top:8px;padding-top:6px;display:flex;justify-content:space-between;font-weight:700">
            <span>Total</span><span>${total}</span>
          </div>
        </div>`;
      },
    },
    fill: { opacity: 1 },
    states: {
      hover: { filter: { type: 'darken', value: 0.08 } },
      active: { filter: { type: 'darken', value: 0.12 } },
    },
    responsive: [
      {
        // Mobile portrait
        breakpoint: 640,
        options: {
          legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '11px' },
          yaxis: { labels: { maxWidth: 120, style: { fontSize: '11px' } } },
          xaxis: { labels: { style: { fontSize: '11px' } } },
          plotOptions: {
            bar: {
              barHeight: '55%',
              dataLabels: { total: { style: { fontSize: '11px' } } },
            },
          },
        },
      },
      {
        // Tablet
        breakpoint: 1024,
        options: {
          legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' },
          yaxis: { labels: { maxWidth: 160, style: { fontSize: '11px' } } },
        },
      },
    ],
    series: data.series as ApexAxisChartSeries,
  } as ApexOptions;
}

type ApexAxisChartSeries = { name?: string; data: number[] }[];

// ─── Component ───────────────────────────────────────────────────────────────

export const HorizontalStackedBarChart: React.FC<HorizontalStackedBarChartProps> = ({
  data,
  height = 480,
  seriesColors = {},
}) => {
  const { isDarkMode } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<ApexCharts | null>(null);
  const [rendered, setRendered] = React.useState(false);

  const hasData = data.categories.length > 0 && data.series.some((s) => s.data.some((v) => v > 0));

  // ── Mount/unmount ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!containerRef.current || !hasData) {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
        setRendered(false);
      }
      return;
    }

    let alive = true;
    const options = buildOptions(data, isDarkMode, height, seriesColors);
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
    // Re-mount only when structural props change
  }, [height, hasData]);

  // ── Sync data/theme without re-mounting ───────────────────────────────────
  React.useEffect(() => {
    if (!instanceRef.current || !hasData) return;
    const opts = buildOptions(data, isDarkMode, height, seriesColors);
    instanceRef.current.updateOptions(opts, false, false, false);
  }, [isDarkMode, data, hasData, height, seriesColors]);

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
    <div className="relative rounded-xl border bg-card p-4 shadow-sm">
      {!rendered && (
        <div
          className="absolute inset-0 bg-muted/40 animate-pulse rounded-xl"
          style={{ minHeight: height }}
        />
      )}
      <div ref={containerRef} />
    </div>
  );
};
