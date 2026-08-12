import * as React from 'react';
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Trophy,
  Minus,
} from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { EmptyPlaceholder } from '../EmptyPlaceholder';
import { DetailField } from '../DetailField';
import { DetailChipList } from '../DetailChipList';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { DetailAvailabilityGrid, type AvailabilitySlot } from '../DetailAvailabilityGrid';
import {
  VOLUNTEER_STATUS_CONFIG,
  getVolunteerGenderLabel,
} from '@/components/volunteers/volunteer-configs';
import type { Volunteer } from '@/types/volunteer.types';
import { StaffUserGamificationSection } from '@/components/gamification/StaffUserGamificationSection';
import { normalizeStaffAccountStatus } from '@/types/user.types';

export const renderVolunteerContent = (volunteer: Volunteer): React.ReactNode => {
  const statusKey = normalizeStaffAccountStatus(String(volunteer.status));
  const statusConfig = VOLUNTEER_STATUS_CONFIG[statusKey] || VOLUNTEER_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const subjectNames = volunteer.userProfiles?.[0]?.subjectNames || [];
  const availability = volunteer.userProfiles?.[0]?.availability as
    | { weekly: AvailabilitySlot[] }
    | undefined;
  const vscReportsFrequencies = volunteer.userProfiles?.[0]?.vscReportsFrequencies;
  const genderLabel = getVolunteerGenderLabel(volunteer.userProfiles?.[0]?.gender);

  const getStatusColor = (status: string): 'success' | 'error' =>
    normalizeStaffAccountStatus(status) === 'deactivated' ? 'error' : 'success';

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
                {volunteer.firstName} {volunteer.lastName}
              </h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(volunteer.status)}
                variant="filled"
              />
              {genderLabel && (
                <DetailBadge
                  label={genderLabel}
                  icon={User}
                  colorName="color-2"
                  variant="outlined"
                />
              )}
            </div>
            {volunteer.displayName && (
              <p className="details-view-header-subtitle">{volunteer.displayName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={User} title="Informations personnelles" colorName="color-2" colSpan={1}>
          <div className="space-y-3">
            <DetailField icon={Mail} label="Email" value={volunteer.email || 'N/R'} />
            <DetailField icon={Phone} label="Téléphone" value={volunteer.phone || 'N/R'} />
            {genderLabel && <DetailField icon={User} label="Genre" value={genderLabel} />}
          </div>
        </SectionCard>

        <SectionCard icon={Trophy} title="Progression" colorName="color-3" colSpan={1}>
          <StaffUserGamificationSection userId={volunteer.id} />
        </SectionCard>

        <SectionCard icon={BookOpen} title="Matières accompagnées" colorName="color-3" colSpan={1}>
          {Array.isArray(subjectNames) && subjectNames.length > 0 ? (
            <DetailChipList
              items={subjectNames.map((name, index) => ({
                id: `subject-${index}`,
                label: name,
              }))}
              colorScheme="color-2"
              variant="filled"
            />
          ) : (
            <EmptyPlaceholder message="Aucune matière renseignée" />
          )}
        </SectionCard>

        <SectionCard icon={Clock} title="Disponibilités" colorName="color-2" colSpan={2}>
          {availability?.weekly && availability.weekly.length > 0 ? (
            <DetailAvailabilityGrid slots={availability.weekly} variant="compact" />
          ) : (
            <EmptyPlaceholder message="Aucune disponibilité renseignée" />
          )}
        </SectionCard>

        <SectionCard
          icon={FileText}
          title="Configuration des rapports VSC"
          colorName="color-3"
          colSpan={1}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <DetailField
                label="Rapport journalier"
                value={vscReportsFrequencies?.daily ? 'Activé (tous les jours à 20h)' : 'Désactivé'}
              />
              <DetailBadge
                label={vscReportsFrequencies?.daily ? 'Activé' : 'Désactivé'}
                icon={vscReportsFrequencies?.daily ? CheckCircle : XCircle}
                colorName={vscReportsFrequencies?.daily ? 'success' : 'error'}
                variant="filled"
              />
            </div>
            <div className="flex items-center justify-between">
              <DetailField
                label="Rapport hebdomadaire"
                value={vscReportsFrequencies?.weekly ? 'Activé (dimanche à 20h)' : 'Désactivé'}
              />
              <DetailBadge
                label={vscReportsFrequencies?.weekly ? 'Activé' : 'Désactivé'}
                icon={vscReportsFrequencies?.weekly ? CheckCircle : XCircle}
                colorName={vscReportsFrequencies?.weekly ? 'success' : 'error'}
                variant="filled"
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {volunteer.createdAt && (
        <div className="mt-8 pt-4 border-t border-[var(--color-1-nuance-3)]">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Créé le {new Date(volunteer.createdAt).toLocaleDateString('fr-FR')}</span>
            {volunteer.updatedAt && (
              <>
                <Minus className="w-3 h-3" />
                <span>Modifié le {new Date(volunteer.updatedAt).toLocaleDateString('fr-FR')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
