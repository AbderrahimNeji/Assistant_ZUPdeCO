import * as React from 'react';
import { User, Mail, Phone, BookOpen, Clock, Trophy, Minus, Target } from 'lucide-react';
import { DetailBadge } from '../DetailBadge';
import { EmptyPlaceholder } from '../EmptyPlaceholder';
import { DetailField } from '../DetailField';
import { DetailChipList } from '../DetailChipList';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { DetailAvailabilityGrid, type AvailabilitySlot } from '../DetailAvailabilityGrid';
import { TUTOR_STATUS_CONFIG, getTutorGenderLabel } from '@/components/tutors/tutor-configs';
import type { Tutor } from '@/types/tutor.types';
import { StaffUserGamificationSection } from '@/components/gamification/StaffUserGamificationSection';
import { normalizeStaffAccountStatus } from '@/types/user.types';

export const renderTutorContent = (tutor: Tutor): React.ReactNode => {
  const statusKey = normalizeStaffAccountStatus(String(tutor.status));
  const statusConfig = TUTOR_STATUS_CONFIG[statusKey] || TUTOR_STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  // Use subjectNames if available, otherwise fall back to subjects IDs
  const subjectNames = tutor.userProfiles?.[0]?.subjectNames || [];
  const availability = tutor.userProfiles?.[0]?.availability as
    | { weekly: AvailabilitySlot[] }
    | undefined;
  const genderLabel = getTutorGenderLabel(tutor.userProfiles?.[0]?.gender);
  const targetHours = tutor.userProfiles?.[0]?.targetHours;

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
                {tutor.firstName} {tutor.lastName}
              </h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(tutor.status)}
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
            {tutor.displayName && (
              <p className="details-view-header-subtitle">{tutor.displayName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="details-view-grid">
        <SectionCard icon={User} title="Informations personnelles" colorName="color-2" colSpan={2}>
          <div className="space-y-3">
            <DetailField icon={Mail} label="Email" value={tutor.email || 'N/R'} />
            <DetailField icon={Phone} label="Téléphone" value={tutor.phone || 'N/R'} />
            {genderLabel && <DetailField icon={User} label="Genre" value={genderLabel} />}
          </div>
        </SectionCard>

        <SectionCard icon={Trophy} title="Progression" colorName="color-3" colSpan={1}>
          <StaffUserGamificationSection userId={tutor.id} />
        </SectionCard>

        <SectionCard icon={BookOpen} title="Matières enseignées" colorName="color-3" colSpan={1}>
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
            <EmptyPlaceholder message="Aucune spécialisation renseignée" />
          )}
        </SectionCard>

        <SectionCard icon={Target} title="Objectifs" colorName="color-3" colSpan={2}>
          <div className="space-y-3">
            <DetailField
              icon={Target}
              label="Heures à réaliser"
              value={targetHours != null ? `${Number(targetHours)} h` : 'Non renseigné'}
            />
            {tutor.hoursDone != null && (
              <DetailField icon={Clock} label="Heures réalisées" value={`${tutor.hoursDone} h`} />
            )}
            {targetHours != null && tutor.hoursDone != null && (
              <DetailField
                icon={Trophy}
                label="Progression"
                value={
                  Number(targetHours) > 0
                    ? `${Math.min(Math.round((tutor.hoursDone / Number(targetHours)) * 100), 100)} %`
                    : 'N/A'
                }
              />
            )}
          </div>
        </SectionCard>

        <SectionCard icon={Clock} title="Disponibilités" colorName="color-2" colSpan={2}>
          {availability?.weekly && availability.weekly.length > 0 ? (
            <DetailAvailabilityGrid slots={availability.weekly} variant="compact" />
          ) : (
            <EmptyPlaceholder message="Aucune disponibilité renseignée" />
          )}
        </SectionCard>
      </div>

      {tutor.createdAt && (
        <div className="mt-8 pt-4 border-t border-[var(--color-1-nuance-3)]">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Créé le {new Date(tutor.createdAt).toLocaleDateString('fr-FR')}</span>
            {tutor.updatedAt && (
              <>
                <Minus className="w-3 h-3" />
                <span>Modifié le {new Date(tutor.updatedAt).toLocaleDateString('fr-FR')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
