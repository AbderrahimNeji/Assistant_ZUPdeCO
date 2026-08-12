import * as React from 'react';
import {
  Tag,
  Calendar,
  Info,
  Users,
  CheckCircle2,
  Link as LinkIcon,
  MessageSquare,
} from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { DetailField } from '../DetailField';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { ACTIVITY_STATUS_CONFIG } from '@/components/activities/activity-configs';
import type { Activity } from '@/types/activity.types';

export const renderActivityContent = (activity: Activity): React.ReactNode => {
  const statusConfig = ACTIVITY_STATUS_CONFIG[activity.status] || ACTIVITY_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const getStatusColor = (status: string): 'success' | 'error' => {
    return status === 'active' ? 'success' : 'error';
  };

  return (
    <>
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <Tag className="w-6 h-6 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="details-view-header-title">{activity.label}</h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(activity.status)}
                variant="filled"
              />
            </div>
            <p className="details-view-header-subtitle">{activity.code}</p>
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={Info} title="Informations générales" colorName="color-2" colSpan={1}>
          <div className="space-y-3">
            <DetailField label="Code" value={activity.code} />
            <DetailField label="Libellé" value={activity.label} />
            {activity.description && (
              <DetailField label="Description" value={activity.description} vertical />
            )}
          </div>
        </SectionCard>

        <SectionCard icon={Users} title="Configuration" colorName="color-1" colSpan={1}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {activity.maxTutors !== null && activity.maxTutors !== undefined && (
              <DetailField label="Max tuteurs" value={activity.maxTutors.toString()} />
            )}
            {activity.maxStudents !== null && activity.maxStudents !== undefined && (
              <DetailField label="Max élèves" value={activity.maxStudents.toString()} />
            )}
            {activity.maxVolunteers !== null && activity.maxVolunteers !== undefined && (
              <DetailField label="Max VSC" value={activity.maxVolunteers.toString()} />
            )}
            {activity.maxStudentsPerTutor !== null &&
              activity.maxStudentsPerTutor !== undefined && (
                <DetailField
                  label="Max élèves/tuteur"
                  value={activity.maxStudentsPerTutor.toString()}
                />
              )}
          </div>
        </SectionCard>

        <SectionCard icon={CheckCircle2} title="Options" colorName="color-3" colSpan={1}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={
                  activity.canHasCr ? 'w-4 h-4 text-success' : 'w-4 h-4 text-muted-foreground'
                }
              />
              <span
                className={
                  activity.canHasCr ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'
                }
              >
                Peut avoir un compte-rendu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={activity.bot ? 'w-4 h-4 text-success' : 'w-4 h-4 text-muted-foreground'}
              />
              <span
                className={
                  activity.bot ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'
                }
              >
                Bot activé
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon
                className={
                  activity.withLink ? 'w-4 h-4 text-success' : 'w-4 h-4 text-muted-foreground'
                }
              />
              <span
                className={
                  activity.withLink ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'
                }
              >
                Avec lien
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare
                className={activity.chat ? 'w-4 h-4 text-success' : 'w-4 h-4 text-muted-foreground'}
              />
              <span
                className={
                  activity.chat ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'
                }
              >
                Chat activé
              </span>
            </div>
          </div>
        </SectionCard>

        {activity.createdAt && (
          <SectionCard
            icon={Calendar}
            title="Informations système"
            colorName="color-2"
            colSpan="full"
          >
            <div className="grid grid-cols-2 gap-4">
              <DetailField
                label="Créé le"
                value={new Date(activity.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
              {activity.updatedAt && (
                <DetailField
                  label="Modifié le"
                  value={new Date(activity.updatedAt).toLocaleDateString('fr-FR', {
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
