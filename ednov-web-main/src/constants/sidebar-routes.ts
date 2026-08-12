/**
 * Canonical dashboard routes for known sidebar menus.
 * `elementId` (menu-reports, …) is the source of truth — not config.routePath,
 * which may contain French or outdated slugs and cause 404s.
 */

const STATIC_DASHBOARD_SEGMENTS = new Set([
  'calendar',
  'tutorials',
  'sessions',
  'matching',
  'tutors',
  'gamification-leaderboard',
  'students',
  'volunteers',
  'admins',
  'establishments',
  'reports',
  'vsc-reports',
  'subjects',
  'levels',
  'programs',
  'school-years',
  'activity-types',
  'activities',
  'holidays',
  'specialties',
  'roles',
]);

/** French / legacy URL segments → English router segments. */
export const DASHBOARD_PATH_ALIASES: Record<string, string> = {
  'comptes-rendus': 'reports',
  'compte-rendu': 'reports',
  seances: 'sessions',
  seance: 'sessions',
  etablissements: 'establishments',
  etablissement: 'establishments',
  eleves: 'students',
  eleve: 'students',
  tuteurs: 'tutors',
  tuteur: 'tutors',
  benevoles: 'volunteers',
  benevole: 'volunteers',
  binomes: 'matching',
  binome: 'matching',
  matieres: 'subjects',
  matiere: 'subjects',
  niveaux: 'levels',
  niveau: 'levels',
  programmes: 'programs',
  programme: 'programs',
  'annees-scolaires': 'school-years',
  'annee-scolaire': 'school-years',
  'types-activite': 'activity-types',
  'types-d-activite': 'activity-types',
  'type-activite': 'activity-types',
  activites: 'activities',
  activite: 'activities',
  vacances: 'holidays',
  specialites: 'specialties',
  specialite: 'specialties',
  roles: 'roles',
  'roles-permissions': 'roles',
  calendrier: 'calendar',
  tutoriels: 'tutorials',
  classement: 'gamification-leaderboard',
  'rapports-vsc': 'vsc-reports',
};

type SidebarMenuLike = {
  elementId: string;
  config?: {
    routePath?: unknown;
    [key: string]: unknown;
  } | null;
};

function stripDashboardPrefix(pathname: string): string | null {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/dashboard') return '';
  if (!normalized.startsWith('/dashboard/')) return null;
  return normalized.slice('/dashboard/'.length);
}

/** Map a possibly French/legacy dashboard path to the canonical router path. */
export function canonicalizeDashboardPath(pathname: string): string | undefined {
  const segment = stripDashboardPrefix(pathname);
  if (segment === null) return undefined;
  if (segment === '') return '/dashboard';

  const first = segment.split('/')[0] ?? '';
  const alias = DASHBOARD_PATH_ALIASES[first];
  if (!alias) {
    if (STATIC_DASHBOARD_SEGMENTS.has(first) || first === 'role-group' || first === 'unauthorized') {
      return `/dashboard/${segment}`;
    }
    return undefined;
  }

  const rest = segment.includes('/') ? segment.slice(first.length) : '';
  return `/dashboard/${alias}${rest}`;
}

/**
 * Resolve the URL a sidebar menu item should navigate to.
 * Prefer elementId → known route; then canonicalize config.routePath; then role-group.
 */
export function resolveSidebarRoutePath(menu: SidebarMenuLike): string | undefined {
  const id = menu.elementId?.trim();
  if (id === 'menu-dashboard') {
    return '/dashboard';
  }

  if (id?.startsWith('menu-')) {
    const slug = id.slice('menu-'.length);
    if (STATIC_DASHBOARD_SEGMENTS.has(slug)) {
      return `/dashboard/${slug}`;
    }
  }

  const raw = menu.config?.routePath;
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    return canonicalizeDashboardPath(trimmed) ?? trimmed;
  }

  if (id?.startsWith('menu-')) {
    const slug = id.slice('menu-'.length);
    if (slug && slug !== 'dashboard') {
      return `/dashboard/role-group/${slug}`;
    }
  }

  return undefined;
}

/** Whether the current location matches this menu's canonical route. */
export function isSidebarRouteActive(
  pathname: string,
  routePath: string | undefined,
): boolean {
  if (!routePath) return false;
  const current = pathname.replace(/\/+$/, '') || '/';
  const target = routePath.replace(/\/+$/, '') || '/';
  if (current === target) return true;
  const canonical = canonicalizeDashboardPath(current);
  return canonical === target;
}
