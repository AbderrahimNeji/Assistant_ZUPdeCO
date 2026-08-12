import * as React from 'react';
import { User, GraduationCap, Calendar, Building2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableRow } from '@/components/common/DataTable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PAIR_TYPE_CONFIG } from './pair-configs';
import type { SessionStudentTutorPair } from '@/types/matching.types';

interface PairRowProps {
  pair: SessionStudentTutorPair;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canDeleteRow?: boolean };
}

const formatTime = (time: string) => {
  if (!time) return '--:--';
  return time.slice(0, 5);
};

export const PairRow: React.FC<PairRowProps> = ({ pair, onView, onDelete, pageActions }) => {
  const canDelete = pageActions?.canDeleteRow ?? true;
  const typeConfig = PAIR_TYPE_CONFIG[pair.assignmentSource] || PAIR_TYPE_CONFIG.manual;
  const TypeIcon = typeConfig.icon;

  const sessionDate = pair.session?.sessionDate
    ? format(new Date(pair.session.sessionDate), 'EEEE d MMMM yyyy', { locale: fr })
    : '-';

  const studentProfile = pair.studentUser?.userProfiles?.[0];
  const studentLevel = studentProfile?.level?.label;
  const subjects = studentProfile?.subjectNames || [];
  const subjectCount = subjects.length;

  return (
    <TableRow>
      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)]">
            <User className="w-4 h-4 text-[var(--color-3-nuance-1)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {pair.studentUser?.displayName || '-'}
            </span>
            {studentLevel && <span className="text-xs text-muted-foreground">{studentLevel}</span>}
          </div>
        </div>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
            <GraduationCap className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {`${pair.tutorUser?.firstName || ''} ${pair.tutorUser?.lastName || ''}`.trim() || '-'}
            </span>
            {pair.tutorUser?.userRoles?.[0]?.role.label && (
              <span
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none mt-0.5 self-start"
                style={{
                  background: 'color-mix(in srgb, var(--color-2-nuance-1) 15%, transparent)',
                  color: 'var(--color-2-nuance-1)',
                  border: '1px solid color-mix(in srgb, var(--color-2-nuance-1) 35%, transparent)',
                }}
              >
                {pair.tutorUser.userRoles[0].role.label}
              </span>
            )}
          </div>
        </div>
      </td>

      <td>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
            <span className="font-medium text-foreground capitalize">{sessionDate}</span>
          </div>
          {pair.session?.startTime && (
            <span className="text-xs text-muted-foreground ml-6">
              {formatTime(pair.session.startTime)} - {formatTime(pair.session.endTime)}
            </span>
          )}
        </div>
      </td>

      <td>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: 'var(--color-1-nuance-1)' }} />
          <span className="text-foreground">
            {pair.session?.establishment?.name || 'Non défini'}
          </span>
        </div>
      </td>

      <td>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex">
                <LabelBadge
                  label={`${subjectCount} matière${subjectCount > 1 ? 's' : ''}`}
                  icon={BookOpen}
                  variant="ghost"
                  color="var(--color-3-nuance-1)"
                  size="sm"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {subjects.length > 0 ? subjects.join(', ') : 'Aucune matière'}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>

      <td>
        <LabelBadge
          label={typeConfig.label}
          icon={TypeIcon}
          variant={typeConfig.badgeVariant}
          color={typeConfig.badgeColor}
          size="md"
        />
      </td>

      <td className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Button preset="row-view" onClick={() => onView?.(pair.id)} />
          {canDelete && <Button preset="row-delete" onClick={() => onDelete?.(pair.id)} />}
        </div>
      </td>
    </TableRow>
  );
};
