import * as React from 'react';
import { Shield, Calendar, Info } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { DynamicIcon } from '@/components/forms/IconPicker';
import { ROLE_STATUS_CONFIG, ROLE_MODE_CONFIG } from '@/components/roles/role-configs';
import type { Role } from '@/types/role.types';

export const renderRoleContent = (role: Role): React.ReactNode => {
  const statusConfig = ROLE_STATUS_CONFIG[role.status] || ROLE_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const modeConfig = role.mode ? ROLE_MODE_CONFIG[role.mode] : null;
  const ModeIcon = modeConfig?.icon;

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'active' ? 'success' : 'error';
  };

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            {role.icon ? (
              <div style={{ color: role.color ?? undefined }}>
                <DynamicIcon name={role.icon} className="w-6 h-6" />
              </div>
            ) : (
              <Shield className="w-6 h-6 text-[var(--color-1-nuance-1)]" />
            )}
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{role.label}</h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(role.status)}
                variant="filled"
              />
              {modeConfig && ModeIcon && (
                <DetailBadge
                  label={modeConfig.label}
                  icon={ModeIcon}
                  colorName="color-1"
                  variant="outlined"
                />
              )}
              {role.isSystem && (
                <DetailBadge label="Système" icon={Shield} colorName="color-3" variant="outlined" />
              )}
            </div>
            <p className="details-view-header-subtitle">{role.code}</p>
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Info} title="Informations générales" colorName="color-1" colSpan={2}>
          <div className="space-y-3">
            <DetailField label="Code" value={role.code} />
            <DetailField label="Libellé" value={role.label} />
            {role.description && <DetailField label="Description" value={role.description} />}
            <DetailField label="Groupe" value={role.roleGroupLabel ?? role.roleGroup} />
            {role.hierarchyLevel !== null && role.hierarchyLevel !== undefined && (
              <DetailField label="Niveau hiérarchique" value={`#${role.hierarchyLevel}`} />
            )}
            {role.mode && (
              <DetailField
                label="Mode opérationnel"
                value={
                  role.mode === 'in_person'
                    ? 'Présentiel'
                    : role.mode === 'remote'
                      ? 'Distanciel'
                      : 'Hybride'
                }
              />
            )}
            <DetailField
              label="Type"
              value={
                role.isSystem
                  ? 'Rôle système'
                  : role.isDefault
                    ? 'Rôle par défaut'
                    : 'Rôle personnalisé'
              }
            />
          </div>
        </SectionCard>

        {role.createdAt && (
          <SectionCard icon={Calendar} title="Informations système" colorName="color-2" colSpan={1}>
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={new Date(role.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              {role.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={new Date(role.updatedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
              )}
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
};
