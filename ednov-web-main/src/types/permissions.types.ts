export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

export interface UserRole {
  id: string;
  code: string;
  label: string;
  permissions: Record<string, string[]>;
}

export interface InterfaceAccess {
  elements?: Record<
    string,
    { visible: boolean; editable: boolean; parentElementId?: string | null }
  >;
}
