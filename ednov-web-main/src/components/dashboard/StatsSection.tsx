import * as React from 'react';
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatCard } from '@/components/cards/StatCard';
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  Plus,
  Minus,
  X,
  Filter,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';
import { useDashboardElements } from '@/hooks/useDashboardElements';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePreferencesConfig } from '@/hooks/usePreferencesConfig';
import * as LucideIcons from 'lucide-react';
import { DashboardStatsFilters } from '@/components/dashboard/DashboardStatsFilters';
import {
  DEFAULT_DASHBOARD_STATS_DATE_FILTERS,
  buildDashboardStatsDateQuery,
  type DashboardStatsDateFilterState,
} from '@/lib/dashboard-stats-date-range';

interface StatCardData {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  titleColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  tooltip?: string;
  comparisonLabel?: string;
  visible: boolean;
}

interface StatsSectionProps {
  // Props optionnelles pour permettre un contrôle externe si nécessaire
  editMode?: boolean;
  onToggleEditMode?: () => void;
}

interface SortableStatCardProps {
  stat: StatCardData;
  editMode: boolean;
  onToggleVisibility?: () => void;
}

const SortableStatCard: React.FC<SortableStatCardProps> = ({
  stat,
  editMode,
  onToggleVisibility,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stat.id,
    disabled: !editMode,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'relative',
        editMode && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        !stat.visible && editMode && 'card-hidden',
      )}
    >
      {editMode && onToggleVisibility && (
        <Button
          variant="outline"
          size="icon"
          icon={stat.visible ? Minus : Plus}
          iconOnly
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleVisibility();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            'visibility-toggle-button absolute -top-2 -right-2 z-10 !rounded-full !border-2',
            !stat.visible && 'hidden-card',
          )}
        />
      )}

      <StatCard
        title={stat.title}
        value={stat.value}
        icon={stat.icon}
        iconColor={stat.iconColor}
        iconBgColor={stat.iconBgColor}
        titleColor={stat.titleColor}
        trend={stat.trend}
        description={stat.description}
        tooltip={stat.tooltip}
        comparisonLabel={stat.comparisonLabel}
      />
    </div>
  );
};

// Helper pour récupérer les icônes Lucide dynamiquement
const getLucideIcon = (iconName: string): LucideIcons.LucideIcon => {
  const icons = LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>;
  return icons[iconName] || LucideIcons.HelpCircle;
};

export const StatsSection: React.FC<StatsSectionProps> = ({
  editMode: externalEditMode,
  onToggleEditMode,
}) => {
  // État local pour le mode édition (si non contrôlé par le parent)
  const [internalEditMode, setInternalEditMode] = React.useState(false);
  const editMode = externalEditMode ?? internalEditMode;
  const { saveConfig, isSaving: isSavingDashboardPrefs } = usePreferencesConfig('dashboard');
  const [showAll, setShowAll] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [dateFilters, setDateFilters] = React.useState<DashboardStatsDateFilterState>(
    DEFAULT_DASHBOARD_STATS_DATE_FILTERS,
  );

  const statsApiQuery = React.useMemo(
    () => buildDashboardStatsDateQuery(dateFilters),
    [dateFilters],
  );

  // Fetch dashboard elements (configuration: order, visibility, icons, labels)
  const {
    allElements: dashboardElements = [],
    isLoading: isLoadingElements,
    refetch,
  } = useDashboardElements();

  // Fetch dashboard stats (dynamic values) — filtré par période / dates comme les séances
  const { data: dashboardStats, isLoading: isLoadingStats } = useDashboardStats(statsApiQuery);

  /** Filtres toujours visibles ; squelette uniquement si pas encore de données stats (hors cache). */
  const showStatsSkeleton = isLoadingElements || (isLoadingStats && !dashboardStats);

  // Couleurs uniformes pour toutes les stat cards
  const colorVariants = [
    {
      icon: 'text-[var(--color-2-nuance-1)]',
      bg: 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_15%,transparent)]',
      title: 'text-[var(--color-2-nuance-2)]',
    },
  ];

  const stats = React.useMemo(() => {
    return dashboardElements
      .filter((el) => el.elementType === 'stat_card')
      .map((el) => {
        const dynamicStat = dashboardStats?.stats?.[el.elementId] as
          | {
              value?: string | number;
              trend?: { value: number; isPositive: boolean };
              description?: string;
              comparisonLabel?: string;
            }
          | undefined;

        return {
          id: el.elementId,
          title: el.elementLabel,
          value: dynamicStat?.value ?? (el.config.value as string) ?? '0',
          icon: getLucideIcon((el.config.icon as string) || 'HelpCircle'),
          iconColor: colorVariants[0].icon,
          iconBgColor: colorVariants[0].bg,
          titleColor: colorVariants[0].title,
          trend:
            dateFilters.comparisonPeriod !== 'none'
              ? (dynamicStat?.trend ??
                (el.config.trend as { value: number; isPositive: boolean } | undefined))
              : undefined,
          description: dynamicStat?.description ?? (el.config.description as string | undefined),
          tooltip: el.config.tooltip as string | undefined,
          comparisonLabel:
            dateFilters.comparisonPeriod !== 'none' ? dynamicStat?.comparisonLabel : undefined,
          visible: el.visible !== false,
        };
      });
  }, [dashboardElements, dashboardStats]);

  const [items, setItems] = React.useState(stats);

  React.useEffect(() => {
    // Ne mettre à jour que si stats a réellement changé (éviter la boucle infinie)
    if (JSON.stringify(stats) !== JSON.stringify(items)) {
      setItems(stats);
    }
  }, [stats]); // Retirer items des dépendances pour éviter la boucle

  // Snapshot au passage en mode édition (pour Annuler)
  const initialItemsRef = React.useRef<StatCardData[]>([]);
  const prevEditModeRef = React.useRef(editMode);
  React.useEffect(() => {
    if (editMode && !prevEditModeRef.current) {
      initialItemsRef.current = items.map((i) => ({ ...i }));
      setShowFilters(false); // Fermer les filtres en mode édition
    }
    prevEditModeRef.current = editMode;
  }, [editMode, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const visibleStats = editMode ? items : items.filter((s) => s.visible);
  const hiddenCount = items.filter((s) => !s.visible).length;

  // En mode edit, afficher TOUTES les cards triées (visibles avant, cachées après)
  const displayedStats = React.useMemo(() => {
    if (editMode) {
      return [...items].sort((a, b) => {
        if (a.visible === b.visible) return 0;
        return a.visible ? -1 : 1;
      });
    }
    return showAll ? visibleStats : visibleStats.slice(0, 6);
  }, [editMode, items, showAll, visibleStats]);

  const activeItem = activeId ? items.find((s) => s.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleToggleVisibility = (id: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item)),
    );
  };

  const handleToggleEdit = () => {
    if (onToggleEditMode) {
      onToggleEditMode();
    } else {
      setInternalEditMode(!internalEditMode);
    }
  };

  const handleSaveAndClose = () => {
    saveConfig(
      {
        elements: items.map((item, index) => ({
          id: item.id,
          visible: item.visible,
          order: index,
        })),
      },
      {
        onSuccess: async () => {
          await refetch();

          if (onToggleEditMode) {
            onToggleEditMode();
          } else {
            setInternalEditMode(false);
          }
        },
      },
    );
  };

  const handleCancel = () => {
    const toRestore = initialItemsRef.current.length > 0 ? [...initialItemsRef.current] : stats;
    setItems(toRestore as typeof stats);
    if (onToggleEditMode) {
      onToggleEditMode();
    } else {
      setInternalEditMode(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="section-header">
        <h2 className="section-title">
          Statistiques
          {editMode && hiddenCount > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({hiddenCount} masquée{hiddenCount > 1 ? 's' : ''})
            </span>
          )}
        </h2>
        <div className="section-actions">
          <Button
            preset="section-action"
            icon={Filter}
            tooltipText="Filtrer"
            className={cn(showFilters && 'section-action-button-active')}
            onClick={() => setShowFilters(!showFilters)}
            disabled={editMode}
          />
          {editMode && (
            <Button preset="section-action" icon={X} tooltipText="Annuler" onClick={handleCancel} />
          )}
          <Button
            preset="section-action"
            icon={editMode ? Check : Pencil}
            tooltipText={editMode ? 'Terminer' : 'Modifier'}
            className={cn(editMode && 'section-action-button-active')}
            onClick={editMode ? handleSaveAndClose : handleToggleEdit}
            disabled={editMode && isSavingDashboardPrefs}
          />
        </div>
      </div>

      {showFilters && (
        <div className="filter-groups-container">
          <DashboardStatsFilters
            filters={dateFilters}
            onChange={setDateFilters}
            showEstablishmentFilter
          />
        </div>
      )}

      {/* Stats Grid */}
      {showStatsSkeleton ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          autoScroll={{ enabled: true, threshold: { x: 0.1, y: 0.15 } }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={displayedStats.map((s) => s.id)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedStats.map((stat, index) => (
                <div
                  key={stat.id}
                  className="animate-fade-in-up animate-stagger"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <SortableStatCard
                    stat={stat}
                    editMode={editMode}
                    onToggleVisibility={() => handleToggleVisibility(stat.id)}
                  />
                </div>
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay - shows the real StatCard while dragging */}
          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: 'ease-out',
            }}
          >
            {activeItem ? (
              <div className="drag-overlay-base cursor-grabbing">
                <StatCard
                  title={activeItem.title}
                  value={activeItem.value}
                  icon={activeItem.icon}
                  iconColor={activeItem.iconColor}
                  iconBgColor={activeItem.iconBgColor}
                  titleColor={activeItem.titleColor}
                  trend={activeItem.trend}
                  description={activeItem.description}
                  tooltip={activeItem.tooltip}
                  comparisonLabel={activeItem.comparisonLabel}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Show More/Less Button - caché en mode edit car toutes les cards sont affichées */}
      {!editMode && visibleStats.length > 6 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            icon={showAll ? ChevronUp : ChevronDown}
            iconPosition="left"
          >
            {showAll ? 'Voir moins' : `Voir plus (${visibleStats.length - 6} autres)`}
          </Button>
        </div>
      )}
    </div>
  );
};
