import * as React from 'react';
import { User, Mail, Phone, ShieldUser, Calendar, Building2 } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { EmptyPlaceholder } from '../EmptyPlaceholder';
import { DetailField } from '../DetailField';
import { DetailChipList } from '../DetailChipList';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { ADMIN_STATUS_CONFIG } from '@/components/admins/admin-configs';
import { useRoleConfig } from '@/hooks/useRoleConfig';
import type { Admin } from '@/types/admin.types';
import { normalizeStaffAccountStatus } from '@/types/user.types';

export const renderAdminContent = (admin: Admin): React.ReactNode => {
  return <AdminContent admin={admin} />;
};

const AdminContent: React.FC<{ admin: Admin }> = ({ admin }) => {
  const roleConfig = useRoleConfig();
  const statusKey = normalizeStaffAccountStatus(String(admin.status));
  const statusConfig = ADMIN_STATUS_CONFIG[statusKey] || ADMIN_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const getStatusColor = (status: string): 'success' | 'error' =>
    normalizeStaffAccountStatus(status) === 'deactivated' ? 'error' : 'success';

  const isCoordinator = admin.userRoles?.some(
    (ur) => ur.role?.code?.toLowerCase() === 'coordinator',
  );

  const managedEstablishments = admin.userEstablishments?.map((ue) => ue.establishment) || [];

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <User className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">
                {admin.firstName} {admin.lastName}
              </h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(admin.status)}
                variant="filled"
              />
            </div>
            {admin.displayName && (
              <p className="details-view-header-subtitle">{admin.displayName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={User} title="Informations personnelles" colorName="color-2" colSpan={1}>
          <div className="space-y-3">
            <DetailField icon={Mail} label="Email" value={admin.email || 'N/R'} />
            <DetailField icon={Phone} label="Téléphone" value={admin.phone || 'N/R'} />
          </div>
        </SectionCard>

        <SectionCard icon={ShieldUser} title="Rôles et profil" colorName="color-1" colSpan={2}>
          {admin.userRoles && admin.userRoles.length > 0 ? (
            <DetailChipList
              items={admin.userRoles.map((ur) => {
                const config = roleConfig[ur.role.code?.toUpperCase()];
                return {
                  id: ur.roleId,
                  label: config?.label || ur.role.label,
                  icon: config?.icon,
                };
              })}
              colorScheme="color-2"
              variant="filled"
            />
          ) : (
            <EmptyPlaceholder message="Aucun rôle assigné" />
          )}
        </SectionCard>

        {isCoordinator && (
          <SectionCard
            icon={Building2}
            title="Établissements gérés"
            colorName="color-3"
            colSpan="full"
          >
            {managedEstablishments.length > 0 ? (
              <DetailChipList
                items={managedEstablishments.map((e) => ({
                  id: e.id,
                  label: `${e.name}${e.uaiCode ? ` (${e.uaiCode})` : ''}`,
                  icon: Building2,
                }))}
                colorScheme="color-1"
                variant="outlined"
              />
            ) : (
              <EmptyPlaceholder message="Aucun établissement géré" />
            )}
          </SectionCard>
        )}

        {admin.createdAt && (
          <SectionCard
            icon={Calendar}
            title="Informations système"
            colorName="color-3"
            colSpan="full"
          >
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={new Date(admin.createdAt).toLocaleDateString('fr-FR')}
              />
              {admin.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={new Date(admin.updatedAt).toLocaleDateString('fr-FR')}
                />
              )}
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
};
