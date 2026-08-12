import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Users, CalendarClock } from 'lucide-react';
import { PostItCard } from './PostItCard';
import { TrackingDrawer } from './tracking/TrackingDrawer';
import { useQuery } from '@tanstack/react-query';
import { getAssignedPostIts } from '@/services/post-its.service';
import { fetchRoles } from '@/services/roles.service';
import type { AssignedPostIt, PostIt } from '@/types/post-it.types';
import type { ElementWidth } from '@/types/interface-elements.types';
import { useInterfaceElements } from '@/hooks/useInterfaceElements';
import { describeScheduleShort } from '@/utils/schedule-description';

export type AssignedFilter =
  | 'all'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'specific_date';

const getPostItHeight = (sectionWidth: ElementWidth): number => {
  if (sectionWidth === '1/3') return 200;
  if (sectionWidth === '1/2') return 220;
  return 260;
};

/** Maps an AssignedPostIt template to the PostIt shape PostItCard expects (display-only). */
function toCardShape(t: AssignedPostIt): PostIt {
  return {
    id: t.id,
    companyId: t.companyId,
    createdById: t.createdById,
    createdByName: t.createdByName,
    title: t.title,
    thematic: t.thematic,
    content: t.content,
    color: t.color,
    isPriority: t.isPriority,
    isArchived: false,
    status: 'en_cours',
    deadline: t.specificDateFrom ? new Date(t.specificDateFrom) : null,
    visibleFrom: null,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
    userPermission: isComplete(t) ? 'read' : 'owner',
    isDefault: true,
  };
}

/** A template is "complete" when it has at least one role, a recurrence, and (if quarterly) at least one period. */
const isComplete = (t: AssignedPostIt) =>
  (t.targetRoleIds?.length ?? 0) > 0 &&
  !!t.recurrence &&
  (t.recurrence !== 'quarterly' || (t.quarterlyPeriods?.length ?? 0) > 0);

interface AssignedPostItsBoardProps {
  filter: AssignedFilter;
  dateFrom?: string;
  dateTo?: string;
  quarterlyPeriods?: number[];
  className?: string;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onEditAssigned?: (t: AssignedPostIt) => void;
  onDeleteTemplate?: (id: string) => void;
  /** Fires after data loads — gives the parent the list of template IDs for select-all */
  onDataReady?: (ids: string[]) => void;
  sectionWidth?: ElementWidth;
}

export const AssignedPostItsBoard: React.FC<AssignedPostItsBoardProps> = ({
  filter,
  dateFrom,
  dateTo,
  quarterlyPeriods,
  className,
  selectedIds = [],
  onToggleSelect,
  onEditAssigned,
  onDeleteTemplate,
  onDataReady,
  sectionWidth = 'full',
}) => {
  const postItHeight = getPostItHeight(sectionWidth);
  const [trackingDrawerOpen, setTrackingDrawerOpen] = React.useState(false);
  const [trackingTemplate, setTrackingTemplate] = React.useState<AssignedPostIt | null>(null);

  const { elements: dashboardElements } = useInterfaceElements('dashboard');
  const canTrack = dashboardElements.some((el) => el.elementId === 'postits-assigned-tracking');

  const handleOpenTracking = (template: AssignedPostIt) => {
    setTrackingTemplate(template);
    setTrackingDrawerOpen(true);
  };

  const handleCloseTracking = () => {
    setTrackingDrawerOpen(false);
    setTrackingTemplate(null);
  };

  const { data: rawTemplates = [], isLoading } = useQuery({
    queryKey: ['post-its', 'assigned', filter, dateFrom, dateTo, quarterlyPeriods],
    queryFn: () =>
      getAssignedPostIts({
        filter,
        dateFrom: filter === 'specific_date' ? dateFrom : undefined,
        dateTo: filter === 'specific_date' ? dateTo : undefined,
        quarterlyPeriods: filter === 'quarterly' ? quarterlyPeriods : undefined,
      }),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: fetchRoles,
  });

  // Build roles map for quick lookup
  const rolesMap = React.useMemo(() => {
    return roles.reduce(
      (acc, role) => {
        acc[role.id] = role.label;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [roles]);

  // Build footer badge for a template
  const buildFooterBadge = (t: AssignedPostIt): string => {
    const rolePart = t.targetRoleIds?.[0] ? (rolesMap[t.targetRoleIds[0]] ?? '') : '';
    const schedulePart = t.scheduleConfig
      ? describeScheduleShort(t.scheduleConfig)
      : t.recurrence
        ? t.recurrence === 'weekly'
          ? 'Hebdo'
          : t.recurrence === 'monthly'
            ? 'Mensuel'
            : t.recurrence === 'quarterly'
              ? 'Trimestriel'
              : t.recurrence === 'annually'
                ? 'Annuel'
                : t.recurrence === 'specific_date'
                  ? 'Date spécifique'
                  : ''
        : '';
    return [rolePart, schedulePart].filter(Boolean).join(' · ');
  };

  // Sort: incomplete templates first
  const templates = React.useMemo(() => {
    return [...rawTemplates].sort((a, b) => Number(isComplete(b)) - Number(isComplete(a)));
  }, [rawTemplates]);

  // Notify parent with IDs of incomplete (selectable) templates
  React.useEffect(() => {
    if (!isLoading) {
      onDataReady?.(templates.filter((t) => !isComplete(t)).map((t) => t.id));
    }
  }, [templates, isLoading, onDataReady]);

  // Responsive grid — CSS auto-fill, no JS calculation needed
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  };

  const isSelectable = !!onToggleSelect;

  // Split: incomplete → À assigner (selectable), complete → Assignés (non-selectable)
  const pending = templates.filter((t) => !isComplete(t));
  const assigned = templates.filter((t) => isComplete(t));

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">
        Chargement des post-its assignés…
      </div>
    );
  }

  return (
    <div className={cn('space-y-8 pr-2', className)}>
      {/* ── À assigner (incomplets) ──────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-2-nuance-1)]">
          À assigner ({pending.length})
        </h3>

        {pending.length > 0 ? (
          <div className="grid gap-4" style={gridStyle}>
            {pending.map((template) => (
              <PostItCard
                key={template.id}
                postIt={toCardShape(template)}
                permission="read"
                height={postItHeight}
                isSelectable={isSelectable}
                isSelected={selectedIds.includes(template.id)}
                hasActiveSelection={isSelectable}
                onSelect={() => onToggleSelect?.(template.id)}
                onEdit={onEditAssigned ? () => onEditAssigned(template) : undefined}
                onDelete={onDeleteTemplate ? () => onDeleteTemplate(template.id) : undefined}
                footerBadge={buildFooterBadge(template)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Aucun post-it à assigner</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Utilisez le bouton <strong>+</strong> pour créer un post-it et le configurer avec une
              récurrence automatique.
            </p>
          </div>
        )}
      </div>

      {/* ── Assignés (complets — collapsible) ────────────────── */}
      <details>
        <summary
          className="cursor-pointer text-base font-medium text-[var(--color-1-nuance-1)] mb-3 hover:text-[var(--color-2-nuance-1)] transition-colors flex items-center gap-2 px-3 py-3 rounded-lg border"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-1-nuance-2) 40%, transparent)',
          }}
        >
          <ChevronDown className="w-4 h-4 transition-transform [details[open]_&]:rotate-180" />
          <span>Assignés ({assigned.length})</span>
        </summary>

        {assigned.length > 0 ? (
          <div className="mt-4 grid gap-4" style={gridStyle}>
            {assigned.map((template) => {
              const isSelectableForAssigned = !!onToggleSelect && isComplete(template);
              return (
                <PostItCard
                  key={template.id}
                  postIt={toCardShape(template)}
                  permission="read"
                  height={postItHeight}
                  isSelectable={isSelectableForAssigned}
                  isSelected={selectedIds.includes(template.id)}
                  hasActiveSelection={isSelectableForAssigned}
                  onSelect={
                    isSelectableForAssigned ? () => onToggleSelect?.(template.id) : undefined
                  }
                  onEdit={onEditAssigned ? () => onEditAssigned(template) : undefined}
                  onTrack={canTrack ? () => handleOpenTracking(template) : undefined}
                  footerBadge={buildFooterBadge(template)}
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">Aucun post-it entièrement configuré pour le moment.</p>
            </div>
          </div>
        )}
      </details>

      {trackingTemplate && (
        <TrackingDrawer
          isOpen={trackingDrawerOpen}
          onClose={handleCloseTracking}
          templateId={trackingTemplate.id}
          templateTitle={trackingTemplate.title}
        />
      )}
    </div>
  );
};
