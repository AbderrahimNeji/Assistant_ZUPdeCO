import { InterfaceElement, ElementWidth, LayoutConfig } from '@/types/interface-elements.types';

/**
 * Calculate optimal grid columns based on number of elements and their widths
 */
export const calculateOptimalLayout = (elements: InterfaceElement[]): LayoutConfig => {
  const elementCount = elements.length;

  // Count elements by width
  const widthCounts = elements.reduce(
    (acc, el) => {
      const width = el.width ?? 'auto';
      acc[width] = (acc[width] || 0) + 1;
      return acc;
    },
    {} as Record<ElementWidth, number>,
  );

  // Determine base columns
  let baseColumns: number;

  if (elementCount <= 2) {
    baseColumns = elementCount;
  } else if (elementCount <= 6) {
    baseColumns = 3;
  } else {
    baseColumns = 4;
  }

  // Adjust for full-width elements
  if (widthCounts['full'] && widthCounts['full'] > 0) {
    // If we have full-width elements, we need to accommodate them
    baseColumns = Math.max(baseColumns, 1);
  }

  return {
    columns: baseColumns,
    gap: 4,
    responsive: {
      sm: 1,
      md: Math.min(2, baseColumns),
      lg: Math.min(3, baseColumns),
      xl: baseColumns,
    },
  };
};

/**
 * Convert element width to Tailwind grid column span
 */
export const getColumnSpan = (width: ElementWidth, totalColumns: number): string => {
  switch (width) {
    case '1/3':
      return 'col-span-1';
    case '1/2':
      return totalColumns >= 2 ? 'col-span-2' : 'col-span-1';
    case '2/3':
      return totalColumns >= 3 ? 'col-span-2' : 'col-span-1';
    case 'full':
      return `col-span-${totalColumns}`;
    case 'auto':
    default:
      return 'col-span-1';
  }
};

/**
 * Generate Tailwind grid class based on layout config
 */
export const getGridClass = (config: LayoutConfig): string => {
  const { responsive } = config;

  return `grid grid-cols-${responsive.sm} md:grid-cols-${responsive.md} lg:grid-cols-${responsive.lg} xl:grid-cols-${responsive.xl} gap-${config.gap}`;
};

/**
 * Get responsive column span classes
 */
export const getResponsiveColumnSpan = (width: ElementWidth, config: LayoutConfig): string => {
  const { responsive } = config;

  const classes: string[] = [];

  // Small screens - always span 1
  classes.push('col-span-1');

  // Medium screens
  if (width === 'full') {
    classes.push(`md:col-span-${responsive.md}`);
  } else if (width === '1/2' || width === '2/3') {
    classes.push(`md:col-span-${Math.min(2, responsive.md)}`);
  } else {
    classes.push('md:col-span-1');
  }

  // Large screens
  if (width === 'full') {
    classes.push(`lg:col-span-${responsive.lg}`);
  } else if (width === '2/3') {
    classes.push(`lg:col-span-2`);
  } else if (width === '1/2') {
    classes.push(`lg:col-span-${Math.floor(responsive.lg / 2)}`);
  } else {
    classes.push('lg:col-span-1');
  }

  // Extra large screens
  if (width === 'full') {
    classes.push(`xl:col-span-${responsive.xl}`);
  } else if (width === '2/3') {
    classes.push(`xl:col-span-${Math.floor((responsive.xl * 2) / 3)}`);
  } else if (width === '1/2') {
    classes.push(`xl:col-span-${Math.floor(responsive.xl / 2)}`);
  } else if (width === '1/3') {
    classes.push(`xl:col-span-${Math.floor(responsive.xl / 3)}`);
  } else {
    classes.push('xl:col-span-1');
  }

  return classes.join(' ');
};
