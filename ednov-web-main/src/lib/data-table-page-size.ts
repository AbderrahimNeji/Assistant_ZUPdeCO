/**
 * Grille unique pagination DataTable (management vs section dashboard).
 * @see resolveDataTableItemsPerPage — source utilisée par les DataTables (API pageSize).
 */
import type { ViewMode } from '@/types/data-table.types';
import type { ElementWidth } from '@/types/interface-elements.types';

export type DataTableItemsPerPageMap = Record<ViewMode, Record<ElementWidth, number>>;

function rowWithAuto(
  row: Record<'full' | '1/2' | '2/3' | '1/3', number>,
): Record<ElementWidth, number> {
  return { ...row, auto: row.full };
}

/** Management (`isSection === false`) : list 10 / cards 20 ; `1/2`|`2/3` → 5 ; `1/3` → 3 */
export const ITEMS_PER_PAGE: DataTableItemsPerPageMap = {
  list: rowWithAuto({ full: 10, '2/3': 5, '1/2': 5, '1/3': 3 }),
  cards: rowWithAuto({ full: 20, '2/3': 5, '1/2': 5, '1/3': 3 }),
};

/** Section (`isSection === true`) : aligné sur session-configs — cards `1/2`|`2/3` → 4 */
export const ITEMS_PER_PAGE_SECTION: DataTableItemsPerPageMap = {
  list: rowWithAuto({ full: 5, '2/3': 5, '1/2': 5, '1/3': 3 }),
  cards: rowWithAuto({ full: 8, '2/3': 4, '1/2': 4, '1/3': 3 }),
};

export function resolveDataTableItemsPerPage(
  viewMode: ViewMode,
  layoutWidth: ElementWidth,
  isSection: boolean,
): number {
  const width: Exclude<ElementWidth, 'auto'> = layoutWidth === 'auto' ? 'full' : layoutWidth;
  const config = isSection ? ITEMS_PER_PAGE_SECTION : ITEMS_PER_PAGE;
  return config[viewMode][width];
}
