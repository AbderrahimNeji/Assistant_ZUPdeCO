import * as React from 'react';
import { User, GraduationCap, Calendar, Building2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/forms/Button';
import { LabelBadge } from '@/components/common/LabelBadge';
import { TableCard } from '@/components/common/DataTable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PAIR_TYPE_CONFIG } from './pair-configs';
import type { SessionStudentTutorPair } from '@/types/matching.types';

interface PairCardProps {
  pair: SessionStudentTutorPair;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  pageActions?: { canDeleteRow?: boolean };
}

const formatTime = (time: string) => {
  if (!time) return '--:--';
  return time.slice(0, 5);
};

export const PairCard: React.FC<PairCardProps> = ({ pair, onView, onDelete, pageActions }) => {
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
    <TableCard onClick={() => onView?.(pair.id)}>
      <div className="data-card-header">
        <div className="flex items-center justify-between gap-2 w-full">
          <LabelBadge
            label={typeConfig.label}
            icon={TypeIcon}
            variant={typeConfig.badgeVariant}
            color={typeConfig.badgeColor}
            size="sm"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
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
        </div>
      </div>

      <div className="data-card-content">
        {/* Tuteur et Élève côte à côte */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Tuteur */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_10%,transparent)]">
              <GraduationCap className="w-4 h-4 text-[var(--color-2-nuance-1)]" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">
                {pair.tutorUser?.userRoles?.[0]?.role.label || 'Tuteur'}
              </span>
              <span className="font-medium text-foreground text-sm truncate">
                {`${pair.tutorUser?.firstName || ''} ${pair.tutorUser?.lastName || ''}`.trim() ||
                  '-'}
              </span>
            </div>
          </div>

          {/* Élève */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--color-3-nuance-1)_10%,transparent)]">
              <User className="w-4 h-4 text-[var(--color-3-nuance-1)]" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">Élève</span>
              <span className="font-medium text-foreground text-sm truncate">
                {pair.studentUser?.displayName || '-'}
              </span>
              {studentLevel && (
                <span className="text-xs text-muted-foreground truncate">{studentLevel}</span>
              )}
            </div>
          </div>
        </div>

        {/* Séance info */}
        <div className="pt-3 border-t space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-2-nuance-1)]" />
              <span className="text-xs text-foreground capitalize">{sessionDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--color-1-nuance-1)' }} />
              <span className="text-xs text-foreground">
                {pair.session?.establishment?.name || 'Non défini'}
              </span>
            </div>
          </div>
          {pair.session?.startTime && (
            <span className="text-xs text-muted-foreground">
              {formatTime(pair.session.startTime)} - {formatTime(pair.session.endTime)}
            </span>
          )}
        </div>
      </div>

      <div className="data-card-footer">
        <div className="flex gap-2">
          <Button
            preset="row-view"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(pair.id);
            }}
          />
          {canDelete && (
            <Button
              preset="row-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(pair.id);
              }}
            />
          )}
        </div>
      </div>
    </TableCard>
  );
};
