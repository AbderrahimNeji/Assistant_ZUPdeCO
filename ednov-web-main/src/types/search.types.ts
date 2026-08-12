export interface UserSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  establishmentName?: string;
  roleCode: string;
  roleLabel: string;
}

export interface EstablishmentSearchResult {
  id: string;
  name: string;
  type?: string;
  city?: string;
}

export interface PaginatedSearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GlobalSearchResults {
  tutors: PaginatedSearchResult<UserSearchResult>;
  students: PaginatedSearchResult<UserSearchResult>;
  volunteers: PaginatedSearchResult<UserSearchResult>;
  admins: PaginatedSearchResult<UserSearchResult>;
  establishments: PaginatedSearchResult<EstablishmentSearchResult>;
}

export interface GlobalSearchResponse {
  data: GlobalSearchResults;
  totalResults: number;
}

export type SearchResultType = 'tutor' | 'student' | 'volunteer' | 'admin' | 'establishment';

export interface MenuSearchResult {
  id: string;
  label: string;
  type: 'view' | 'create';
  route: string;
  icon: string;
  keywords: string[];
  resource: string;
  requiresWrite?: boolean;
  requiredElement?: {
    interface: string;
    elementId: string;
  };
  excludeIfSingleAdminTab?: boolean;
  /** Si true, l’entrée n’apparaît pas dans la recherche (le code / la route restent en place) */
  hidden?: boolean;
}

export interface SearchResultItem {
  id: string;
  type: SearchResultType | 'menu';
  label: string;
  sublabel: string;
  icon: string;
  iconColor: 'color-1' | 'color-2' | 'color-3';
  route: string;
  data?: UserSearchResult | EstablishmentSearchResult;
}
