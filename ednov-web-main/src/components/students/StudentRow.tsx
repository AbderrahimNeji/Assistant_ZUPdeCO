import * as React from 'react';
import { User, Eye, Edit, Trash2, GraduationCap, Baby, Building2, Heart } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { STUDENT_STATUS_CONFIG, getStudentGenderConfig } from './student-configs';
import type { Student } from '@/types/student.types';
import { normalizeStudentAccountStatus } from '@/types/user.types';

// ══════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════

/**
 * Props du composant StudentRow
 */
interface StudentRowProps {
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
 * Ligne de tableau pour un élève dans la vue "list" du DataTable
 *
 * Affiche 7 colonnes: Nom, Genre, Niveau, Statut, Profil, Établissement(s), Actions
 * Retourne un fragment (pas de <tr>) car le <tr> est rendu par le parent
 *
 * @param student - Données de l'élève
 * @param onView - Callback "Voir détails"
 * @param onEdit - Callback "Modifier"
 * @param onDelete - Callback "Supprimer"
 */
export const StudentRow: React.FC<StudentRowProps> = ({
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
  const genderConfig = getStudentGenderConfig(profile?.gender ?? null);
  const GenderIcon = genderConfig.icon;

  return (
    <TableRow>
      {/* ════════════════════════════════════
          COLONNE 1 : Nom (avec icône)
          ════════════════════════════════════ */}
      <td>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <User className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{student.displayName || 'Sans nom'}</span>
          </div>
        </div>
      </td>

      {/* ════════════════════════════════════
          COLONNE 2 : Genre
          ════════════════════════════════════ */}
      <td>
        <LabelBadge
          label={genderConfig.label}
          icon={GenderIcon}
          variant={genderConfig.badgeVariant}
          size="sm"
        />
      </td>

      {/* ════════════════════════════════════
          COLONNE 3 : Niveau scolaire
          ════════════════════════════════════ */}
      <td>
        <LabelBadge
          label={levelLabel ?? 'N/R'}
          icon={GraduationCap}
          variant="ghost"
          color="var(--color-2-nuance-1)"
          size="sm"
        />
      </td>

      {/* ════════════════════════════════════
          COLONNE 4 : Statut
          ════════════════════════════════════ */}
      <td>
        <LabelBadge
          label={statusConfig.label}
          icon={StatusIcon}
          variant={statusConfig.badgeVariant}
          color={statusConfig.badgeColor}
          size="md"
        />
      </td>

      {/* ════════════════════════════════════
          COLONNE 5 : Profil (mineur, besoins spécifiques)
          ════════════════════════════════════ */}
      <td>
        <div className="flex flex-col items-center gap-2 justify-center">
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
          {!isMinor && !hasSpecialNeeds && <span className="text-sm text-muted-foreground">-</span>}
        </div>
      </td>

      {/* ════════════════════════════════════
          COLONNE 6 : Établissement(s)
          ════════════════════════════════════ */}
      <td>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-sm text-foreground">
            {student.userEstablishments && student.userEstablishments.length > 0
              ? student.userEstablishments
                  .filter((ue) => ue.establishment !== null)
                  .map((ue) => ue.establishment.name)
                  .join(', ') || '-'
              : '-'}
          </span>
        </div>
      </td>

      {/* ════════════════════════════════════
          COLONNE 7 : Date d'entrée
          ════════════════════════════════════ */}
      <td>
        <span className="text-sm text-foreground">
          {student.createdAt ? new Date(student.createdAt).toLocaleDateString('fr-FR') : '-'}
        </span>
      </td>

      {/* ════════════════════════════════════
          COLONNE 8 : Date de sortie
          ════════════════════════════════════ */}
      <td>
        <span className="text-sm text-foreground">
          {(student as any).deactivationDate
            ? new Date((student as any).deactivationDate).toLocaleDateString('fr-FR')
            : '-'}
        </span>
      </td>

      {/* ════════════════════════════════════
          COLONNE 9 : Motif de sortie
          ════════════════════════════════════ */}
      <td>
        <span className="text-sm text-foreground">
          {(() => {
            const reason = (student as any).deactivationReason;
            const note = (student as any).deactivationReasonNote;
            if (!reason) return '-';
            if (reason === 'Autre' && note) return note;
            return reason;
          })()}
        </span>
      </td>

      {/* ════════════════════════════════════
          COLONNE 10 : Taux de présence
          ════════════════════════════════════ */}
      <td>
        <span className="text-sm text-foreground">
          {(student as any).presenceRate != null ? `${(student as any).presenceRate}\u00a0%` : '-'}
        </span>
      </td>

      {/* ════════════════════════════════════
          COLONNE 11 : Boutons d'action
          ════════════════════════════════════ */}
      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button preset="row-view" onClick={() => onView?.(student.id)} />

          {canEdit && <Button preset="row-edit" onClick={() => onEdit?.(student.id)} />}

          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(student.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
