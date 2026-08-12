import * as React from 'react';
import { User, GraduationCap, Baby, BookOpen, Heart } from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { STUDENT_STATUS_CONFIG, getStudentGenderConfig } from './student-configs';
import type { Student } from '@/types/student.types';
import { normalizeStudentAccountStatus } from '@/types/user.types';

// ══════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════

/**
 * Props du composant StudentCard
 */
interface StudentCardProps {
  student: Student;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canEditRow?: boolean; canDeleteRow?: boolean };
}

// ══════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════

/**
 * Carte visuelle pour un élève dans la vue "cards" du DataTable
 *
 * Affiche les informations essentielles (nom, statut, niveau, matières)
 * et les boutons d'action (Voir, Modifier, Supprimer)
 *
 * @param student - Données de l'élève
 * @param onView - Callback "Voir détails"
 * @param onEdit - Callback "Modifier"
 * @param onDelete - Callback "Supprimer"
 */
export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onView,
  onEdit,
  onDelete,
  pageActions,
}) => {
  const canEdit = pageActions?.canEditRow ?? true;
  const canDelete = pageActions?.canDeleteRow ?? true;
  const statusKey = normalizeStudentAccountStatus(String(student.status));
  const statusConfig = STUDENT_STATUS_CONFIG[statusKey] || STUDENT_STATUS_CONFIG.registered;
  const StatusIcon = statusConfig.icon;

  // Extraction des données du profil
  const profile = student.userProfiles?.[0];
  const levelLabel = profile?.level?.label?.trim() || null;
  const isMinor = profile?.isMinor;
  const hasSpecialNeeds = profile?.hasSpecialNeeds;
  const subjects = profile?.subjects || [];
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;

  const genderConfig = getStudentGenderConfig(profile?.gender ?? null);
  const GenderIcon = genderConfig.icon;

  /**
   * Gère le clic sur la carte entière (ouvre le détail)
   */
  const handleClick = () => {
    onView?.(student.id);
  };

  /**
   * Gère les touches clavier (Enter/Space) pour l'accessibilité
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView?.(student.id);
    }
  };

  return (
    <TableCard
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      ariaLabel={`Voir les détails de ${student.displayName || 'cet élève'}`}
    >
      {/* ════════════════════════════════════
          CONTENT - Infos élève
          ════════════════════════════════════ */}
      <div className="data-card-content">
        {/* Nom + Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]">
            <User className="w-5 h-5 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-foreground text-base truncate">
              {student.displayName || 'Sans nom'}
            </span>
            <div className="flex items-center flex-wrap gap-2 mt-0.5 h-[52px] content-start">
              <LabelBadge
                label={statusConfig.label}
                icon={StatusIcon}
                variant={statusConfig.badgeVariant}
                color={statusConfig.badgeColor}
                size="sm"
              />
              <LabelBadge
                label={genderConfig.label}
                icon={GenderIcon}
                variant={genderConfig.badgeVariant}
                color={genderConfig.badgeColor}
                size="sm"
              />
              {isMinor && (
                <LabelBadge
                  label="Mineur"
                  icon={Baby}
                  variant="ghost"
                  color="var(--color-1-nuance-1)"
                  size="sm"
                />
              )}
              {hasSpecialNeeds && (
                <LabelBadge
                  label="Besoins spécifiques"
                  icon={Heart}
                  variant="ghost"
                  color="var(--color-3-nuance-1)"
                  size="sm"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex-1"></div>

        {/* Niveau + Matières (même ligne, collé au footer) */}
        <div className="flex items-center gap-8">
          <LabelBadge
            label={levelLabel ?? 'N/R'}
            icon={GraduationCap}
            variant="ghost"
            color="var(--color-2-nuance-1)"
            size="sm"
          />
          <LabelBadge
            label={`${subjectCount} matière${subjectCount > 1 ? 's' : ''}`}
            icon={BookOpen}
            variant="outlined"
            color="var(--color-3-nuance-1)"
            size="sm"
          />
        </div>
      </div>

      {/* ════════════════════════════════════
          FOOTER - Boutons d'action
          ════════════════════════════════════ */}
      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(student.id);
            }}
          />
          {canEdit && (
            <Button
              preset="row-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(student.id);
              }}
            />
          )}
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(student.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
