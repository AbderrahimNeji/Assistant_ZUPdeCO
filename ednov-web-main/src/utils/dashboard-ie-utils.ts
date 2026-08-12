import type { ElementWidth } from '@/types/interface-elements.types';

// Union type mirroring DashboardSection['type'] in DashboardLayout.tsx
export type DashboardSectionType =
  | 'stats'
  | 'postits'
  | 'sessions'
  | 'pairs'
  | 'calendar'
  | 'sessions-chart'
  | 'resources-chart'
  | 'establishments'
  | 'tutors'
  | 'students'
  | 'volunteers'
  | 'admins'
  | 'reports'
  | 'vsc-reports'
  | 'subjects'
  | 'levels'
  | 'programs'
  | 'school-years'
  | 'activity-types'
  | 'activities'
  | 'holidays';

const KNOWN_TYPES = new Set<DashboardSectionType>([
  'stats',
  'postits',
  'sessions',
  'pairs',
  'calendar',
  'sessions-chart',
  'resources-chart',
  'establishments',
  'tutors',
  'students',
  'volunteers',
  'admins',
  'reports',
  'vsc-reports',
  'subjects',
  'levels',
  'programs',
  'school-years',
  'activity-types',
  'activities',
  'holidays',
]);

/**
 * Maps a section type to the permission resource name.
 * Used for permission checks (hasPermission calls).
 * Mirrors getSectionResource in DashboardPage.tsx — keep them in sync.
 */
export const getSectionResource = (sectionType: DashboardSectionType): string | null => {
  const mapping: Record<DashboardSectionType, string | null> = {
    stats: 'dashboard',
    postits: 'dashboard',
    sessions: 'sessions',
    pairs: 'pairs',
    calendar: 'calendar',
    'sessions-chart': 'dashboard',
    'resources-chart': 'dashboard',
    establishments: 'establishments',
    tutors: 'tutors',
    students: 'students',
    volunteers: 'volunteers',
    admins: 'admins',
    reports: 'reports',
    'vsc-reports': 'vsc-reports',
    subjects: 'subjects',
    levels: 'levels',
    programs: 'programs',
    'school-years': 'school-years',
    'activity-types': 'activity-types',
    activities: 'activities',
    holidays: 'holidays',
  };
  return mapping[sectionType] ?? null;
};

/**
 * Maps a section type to the interface-elements endpoint name (IE name).
 * Returns null for sections that have no dedicated IE endpoint (e.g. calendar).
 * NOTE: some names use camelCase to match the backend endpoint names.
 */
export const getSectionIEResource = (sectionType: DashboardSectionType): string | null => {
  const mapping: Record<DashboardSectionType, string | null> = {
    stats: 'dashboard',
    postits: 'dashboard',
    sessions: 'sessions',
    pairs: 'pairs',
    calendar: null,
    'sessions-chart': 'dashboard',
    'resources-chart': 'dashboard',
    establishments: 'establishments',
    tutors: 'tutors',
    students: 'students',
    volunteers: 'volunteers',
    admins: 'admins',
    reports: 'reports',
    'vsc-reports': 'vsc-reports',
    subjects: 'subjects',
    levels: 'levels',
    programs: 'programs',
    'school-years': 'schoolYears',
    'activity-types': 'activityTypes',
    activities: 'activities',
    holidays: 'holidays',
  };
  return mapping[sectionType] ?? null;
};

// Minimal shape needed for row calculation
interface SectionLike {
  id: string;
  width: ElementWidth;
}

interface VisualRow<T extends SectionLike> {
  sections: T[];
  totalCols: number;
}

const getColSpan = (width: ElementWidth): number => {
  switch (width) {
    case 'full':
      return 12;
    case '2/3':
      return 8;
    case '1/2':
      return 6;
    case '1/3':
      return 4;
    default:
      return 12;
  }
};

/**
 * Splits a flat list of sections into visual rows (12-column grid).
 * Mirrors calculateRows in DashboardLayout.tsx — used here without importing that file
 * to avoid circular dependencies.
 */
export const calculateDashboardRows = <T extends SectionLike>(sectionList: T[]): VisualRow<T>[] => {
  const rows: VisualRow<T>[] = [];
  let currentRow: VisualRow<T> = { sections: [], totalCols: 0 };

  for (const section of sectionList) {
    const cols = getColSpan(section.width);
    if (currentRow.totalCols + cols > 12 && currentRow.sections.length > 0) {
      rows.push(currentRow);
      currentRow = { sections: [section], totalCols: cols };
    } else {
      currentRow.sections.push(section);
      currentRow.totalCols += cols;
    }
  }

  if (currentRow.sections.length > 0) rows.push(currentRow);
  return rows;
};

/** Extracts section type from a section id like 'section-sessions' → 'sessions'. */
const sectionIdToType = (id: string): DashboardSectionType | null => {
  const type = id.replace(/^section-/, '') as DashboardSectionType;
  return KNOWN_TYPES.has(type) ? type : null;
};

/** Default section order used when no preferences are saved yet. */
const DEFAULT_SECTION_IDS: Array<{ id: string; width: ElementWidth }> = [
  { id: 'section-stats', width: 'full' },
  { id: 'section-postits', width: 'full' },
  { id: 'section-sessions', width: 'full' },
  { id: 'section-pairs', width: 'full' },
  { id: 'section-calendar', width: 'full' },
  { id: 'section-sessions-chart', width: 'full' },
];

/**
 * Calculates the list of interface-element names to preload at login.
 *
 * Strategy:
 * - Always includes ONLY 'dashboard' and 'sidebar'.
 * - Other interfaces will be loaded on-demand when sections are rendered.
 *
 * @param _rawConfig    Unused - kept for backwards compatibility
 * @param _viewportRows Unused - kept for backwards compatibility
 * @param _preloadRows  Unused - kept for backwards compatibility
 */
export const getInitialInterfacesToLoad = (
  _rawConfig?: Record<string, unknown> | undefined,
  _viewportRows = 2,
  _preloadRows = 2,
): string[] => {
  // Load ALL interfaces at startup for GlobalSearch to work
  // GlobalSearch needs access to all interfaces to check canViewInterface(menu.resource)
  return [
    'dashboard',
    'sidebar',
    'tutors',
    'students',
    'volunteers',
    'admins',
    'establishments',
    'sessions',
    'matching',
    'calendar',
    'levels',
    'programs',
    'school-years',
    'activity-types',
    'activities',
    'holidays',
    'subjects',
    'specialties',
    'reports',
    'vsc-reports',
    'roles',
  ];
};
