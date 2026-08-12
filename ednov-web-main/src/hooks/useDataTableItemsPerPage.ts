import * as React from 'react';
import { resolveDataTableItemsPerPage } from '@/lib/data-table-page-size';
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';

export function useDataTableItemsPerPage(
  viewMode: ViewMode,
  layoutWidth: ElementWidth,
  isSection: boolean,
): number {
  return React.useMemo(
    () => resolveDataTableItemsPerPage(viewMode, layoutWidth, isSection),
    [viewMode, layoutWidth, isSection],
  );
}
