import * as React from 'react';
import { DynamicRoleGroupManagementPage } from '@/components/common/DynamicRoleGroupManagementPage';

/**
 * Administration management page.
 *
 * Thin wrapper over DynamicRoleGroupManagementPage for the 'admins' role group.
 * Tabs are driven dynamically by the 'admins' interface IE in the database —
 * adding a new role with roleGroup = 'admins' automatically creates a new tab
 * via autoGenerateTabInterfaceElement in roles.service.ts.
 */
export const AdminsManagementPage: React.FC = () => (
  <DynamicRoleGroupManagementPage
    interfaceName="admins"
    menuId="menu-admins"
    title="Administration"
    subtitle="Créez, modifiez et gérez tous vos collaborateurs"
    createLabel="Créer un collaborateur"
    userQueryKey="admin"
  />
);
