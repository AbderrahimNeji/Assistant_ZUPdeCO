export type ElementType =
  | 'stat_card'
  | 'table'
  | 'chart'
  | 'widget'
  | 'list'
  | 'form'
  | 'custom'
  | 'menu'
  | 'action'
  | 'tab'
  | 'filter';
export type ElementWidth = '1/3' | '1/2' | '2/3' | 'full' | 'auto';

export interface InterfaceElement {
  id: string;
  interfaceName: string;
  elementId: string;
  elementType: ElementType;
  elementLabel: string;
  visible: boolean | null;
  order: number | null;
  width: ElementWidth | null;
  config: Record<string, unknown>;
  userVisible?: boolean;
  userOrder?: number;
  groupLabel?: string | null;
  groupIcon?: string | null;
  groupOrder?: number;
  parentId?: string | null;
  entitySubKey?: string | null;
  entityFilter?: Record<string, unknown> | null;
  mode?: 'in_person' | 'remote' | 'hybrid' | null;
}

export type InterfaceElementResponseDto = InterfaceElement;

export interface LayoutConfig {
  columns: number;
  gap: number;
  responsive: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}
