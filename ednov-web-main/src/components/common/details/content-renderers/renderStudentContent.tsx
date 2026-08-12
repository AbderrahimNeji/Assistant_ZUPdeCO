import * as React from 'react';
import {
  User,
  BookOpen,
  Clock,
  Baby,
  GraduationCap,
  MapPin,
  Building2,
  Calendar,
  Mail,
  Phone,
  Heart,
  Accessibility,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DetailBadge } from '../DetailBadge';
import { EmptyPlaceholder } from '../EmptyPlaceholder';
import { DetailChipList } from '../DetailChipList';
import { SectionCard } from '@/components/common/cards/SectionCard';
import { DetailAvailabilityGrid, type AvailabilitySlot } from '../DetailAvailabilityGrid';
import {
  STUDENT_STATUS_CONFIG,
  getStudentGenderLabel,
  DISABILITY_TYPE_OPTIONS,
  SPECIAL_NEEDS_TYPE_OPTIONS,
} from '@/components/students/student-configs';
import { normalizeStudentAccountStatus } from '@/types/user.types';
import { getSubjects } from '@/services/academic.service';
import type { Student } from '@/types/student.types';

// ══════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════

interface StudentContentProps {
  student: Student;
}

// ══════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════

/**
 * Composant qui génère le contenu de la vue détail d'un élève
 * Affiché dans Collapse (mode liste) ou Modal (mode cards)
 *
 * @param student - Élève complet avec tous les champs
 * @returns JSX Fragment contenant header + badges + grid de sections
 */
export const StudentContent: React.FC<StudentContentProps> = ({ student }) => {
  // Configuration statut
  const statusKey = normalizeStudentAccountStatus(String(student.status));
  const statusConfig = STUDENT_STATUS_CONFIG[statusKey] || STUDENT_STATUS_CONFIG.registered;
  const StatusIcon = statusConfig.icon;

  // Charger toutes les matières pour mapper les IDs aux labels
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await getSubjects();
      return response.data;
    },
  });

  // Extraction des données du profil
  const profile = student.userProfiles?.[0];
  const level = profile?.level;
  const isMinor = profile?.isMinor;
  const hasSpecialNeeds = profile?.hasSpecialNeeds;
  const specialNeedsType = (profile as any)?.specialNeedsType as string | null | undefined;
  const specialNeedsNote = (profile as any)?.specialNeedsNote as string | null | undefined;

  const isDisabled = (profile as any)?.isDisabled as boolean | undefined;
  const disabilityTypes = (profile as any)?.disabilityTypes as string[] | null | undefined;
  const disabilityOtherNote = (profile as any)?.disabilityOtherNote as string | null | undefined;

  const disabilityTypeItems = (disabilityTypes ?? [])
    .map((val) => {
      const opt = DISABILITY_TYPE_OPTIONS.find((o) => o.value === val);
      return opt ? { id: val, label: opt.label } : { id: val, label: val };
    })
    .concat(
      disabilityTypes?.includes('autre') && disabilityOtherNote
        ? [{ id: 'autre-note', label: disabilityOtherNote }]
        : [],
    );

  const specialNeedsLabel =
    SPECIAL_NEEDS_TYPE_OPTIONS.find((o) => o.value === specialNeedsType?.toLowerCase())?.label ??
    specialNeedsType ??
    null;
  const subjectIds = (profile?.subjects || []) as string[];
  const availability = profile?.availability as { weekly: AvailabilitySlot[] } | undefined;
  const dateOfBirth = profile?.dateOfBirth;
  const gender = profile?.gender;
  const genderLabel = getStudentGenderLabel(gender);
  const addressLine1 = (profile as any)?.addressLine1;
  const department = (profile as any)?.department;
  const postalCode = (profile as any)?.postalCode;
  const city = (profile as any)?.city;
  const medicalNotes = profile?.medicalNotes;

  // Extraction des établissements
  const establishments = student.userEstablishments || [];

  // Mapper les IDs de matières vers leurs labels
  const subjects = subjectIds
    .map((id) => {
      const subject = allSubjects.find((s) => s.id === id);
      return subject ? { id: subject.id, label: subject.label } : null;
    })
    .filter((s): s is { id: string; label: string } => s !== null);

  /**
   * Retourne la couleur sémantique selon le statut
   */
  const getStatusColor = (status: string): 'success' | 'error' =>
    normalizeStudentAccountStatus(status) === 'deactivated' ? 'error' : 'success';

  return (
    <>
      {/* ════════════════════════════════════
          HEADER
          ════════════════════════════════════ */}
      <div className="details-view-header">
        <div className="details-view-header-left">
          <div className="details-view-header-icon">
            <User className="w-7 h-7 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="details-view-header-content">
            <div className="details-view-header-with-badges">
              <h3 className="text-2xl font-bold text-[var(--color-1-nuance-1)]">
                {student.displayName || `${student.firstName} ${student.lastName}` || 'Sans nom'}
              </h3>
              <DetailBadge
                label={statusConfig.label}
                icon={StatusIcon}
                colorName={getStatusColor(student.status)}
                variant="filled"
              />
              {isMinor && (
                <DetailBadge label="Mineur" icon={Baby} colorName="color-1" variant="outlined" />
              )}
              {hasSpecialNeeds && (
                <DetailBadge
                  label={
                    specialNeedsLabel
                      ? specialNeedsType === 'autre' && specialNeedsNote
                        ? `Besoins spécifiques – ${specialNeedsLabel} : "${specialNeedsNote}"`
                        : `Besoins spécifiques – ${specialNeedsLabel}`
                      : 'Besoins spécifiques'
                  }
                  icon={Heart}
                  colorName="color-3"
                  variant="outlined"
                />
              )}
              {isDisabled && (
                <DetailBadge
                  label="En situation de handicap"
                  icon={Accessibility}
                  colorName="color-1"
                  variant="outlined"
                />
              )}
            </div>
            {/* Informations de contact */}
            <div className="mt-2 space-y-1">
              {student.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{student.email}</span>
                </div>
              )}
              {student.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{student.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          GRID DE SECTIONS
          ════════════════════════════════════ */}
      <div className="details-view-grid">
        {/* Section : Informations personnelles */}
        <SectionCard icon={User} title="Informations personnelles" colorName="color-1" colSpan={1}>
          <div className="space-y-2 text-sm">
            {dateOfBirth && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Date de naissance:</span>
                <span>{new Date(dateOfBirth).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
            {genderLabel != null && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Genre:</span>
                <span>{genderLabel}</span>
              </div>
            )}
            {(addressLine1 || department || postalCode || city) && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-medium">Adresse:</span>
                  <div className="text-sm text-foreground mt-1 space-y-0.5">
                    {addressLine1 && <div>{addressLine1}</div>}
                    {(department || postalCode || city) && (
                      <div>
                        {department && <span>{department}</span>}
                        {department && (postalCode || city) && <span>, </span>}
                        {postalCode && <span>{postalCode}</span>}
                        {postalCode && city && <span> </span>}
                        {city && <span>{city}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {!dateOfBirth &&
              genderLabel == null &&
              !addressLine1 &&
              !department &&
              !postalCode &&
              !city && <EmptyPlaceholder message="Aucune information personnelle" />}
          </div>
        </SectionCard>

        {/* Section : Niveau scolaire */}
        <SectionCard icon={GraduationCap} title="Niveau scolaire" colorName="color-1" colSpan={1}>
          {level ? (
            <div className="text-sm font-medium text-foreground">{level.label}</div>
          ) : (
            <EmptyPlaceholder message="Aucun niveau renseigné" />
          )}
        </SectionCard>

        {/* Section : Établissements */}
        <SectionCard icon={Building2} title="Établissements" colorName="color-2" colSpan="full">
          {establishments.length > 0 ? (
            <DetailChipList
              items={establishments.map((ue) => ({
                id: ue.establishment?.id || ue.establishmentId,
                label: ue.establishment?.name || 'Établissement',
              }))}
              colorScheme="color-2"
              variant="filled"
            />
          ) : (
            <EmptyPlaceholder message="Aucun établissement" />
          )}
        </SectionCard>

        {/* Section : Matières suivies */}
        <SectionCard icon={BookOpen} title="Matières suivies" colorName="color-2" colSpan="full">
          {subjects.length > 0 ? (
            <DetailChipList items={subjects} colorScheme="color-2" variant="filled" />
          ) : (
            <EmptyPlaceholder message="Aucune matière sélectionnée" />
          )}
        </SectionCard>

        {/* Section : Disponibilités */}
        <SectionCard icon={Clock} title="Disponibilités" colorName="color-1" colSpan="full">
          {availability?.weekly && availability.weekly.length > 0 ? (
            <DetailAvailabilityGrid slots={availability.weekly} variant="compact" />
          ) : (
            <EmptyPlaceholder message="Aucune disponibilité renseignée" />
          )}
        </SectionCard>

        {/* Section : Situation de handicap */}
        {isDisabled && (
          <SectionCard
            icon={Accessibility}
            title="Situation de handicap"
            colorName="color-1"
            colSpan="full"
          >
            {disabilityTypeItems.length > 0 ? (
              <DetailChipList items={disabilityTypeItems} colorScheme="color-1" variant="filled" />
            ) : (
              <EmptyPlaceholder message="Aucun type de handicap renseigné" />
            )}
          </SectionCard>
        )}

        {/* Section : Notes médicales */}
        {medicalNotes && (
          <SectionCard icon={User} title="Notes" colorName="color-1" colSpan="full">
            <div className="text-sm text-foreground whitespace-pre-wrap">{medicalNotes}</div>
          </SectionCard>
        )}
      </div>

      {/* ════════════════════════════════════
          FOOTER SYSTÈME
          ════════════════════════════════════ */}
      {student.createdAt && (
        <div className="mt-8 pt-4 border-t border-[var(--color-1-nuance-3)]">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Créé le {new Date(student.createdAt).toLocaleDateString('fr-FR')}</span>
            {student.updatedAt && (
              <>
                <span className="text-muted-foreground">•</span>
                <span>Modifié le {new Date(student.updatedAt).toLocaleDateString('fr-FR')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Fonction wrapper pour compatibilité avec l'ancien nom
 * @deprecated Utilisez <StudentContent student={student} /> à la place
 */
export const renderStudentContent = (student: Student): React.ReactNode => {
  return <StudentContent student={student} />;
};
