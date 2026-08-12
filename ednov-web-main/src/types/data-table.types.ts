import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor?: keyof T | ((item: T) => unknown);
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface ActionButton {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'ghost' | 'outline';
  tooltip?: string;
  badge?: boolean;
}

export interface PaginationConfig {
  enabled?: boolean;
  itemsPerPage?: number;
  responsive?: boolean;
}

export interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface FilterOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  color?: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'buttons' | 'select' | 'daterange' | 'custom';
  options?: FilterOption[];
  value?: unknown;
  onChange?: (value: unknown) => void;
  customRender?: () => React.ReactNode;
}

export type ViewMode = 'list' | 'cards';
