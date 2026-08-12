import * as React from 'react';
import { PostIt } from '@/types/post-it.types';
import { PostItCard } from './PostItCard';
import type { ElementWidth } from '@/types/interface-elements.types';
import { Button } from '@/components/forms/Button';
import {
  DndContext,
  pointerWithin,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { updateInterfaceConfig } from '@/services/preferences.service';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

const getPostItHeight = (sectionWidth: ElementWidth): number => {
  if (sectionWidth === '1/3') return 200;
  if (sectionWidth === '1/2') return 220;
  return 260;
};

interface SortablePostItProps {
  postIt: PostIt;
  postItHeight: number;
  onEdit: (postIt: PostIt) => void;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onShare: (postIt: PostIt) => void;
  loadingStates?: Record<
    string,
    {
      deleting?: boolean;
      togglingPriority?: boolean;
      togglingStatus?: boolean;
      sharing?: boolean;
    }
  >;
}

const SortablePostIt: React.FC<SortablePostItProps> = ({
  postIt,
  postItHeight,
  onEdit,
  onDelete,
  onTogglePriority,
  onToggleStatus,
  onShare,
  loadingStates = {},
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: postIt.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      e.stopPropagation();
      onEdit(postIt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDragging && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onEdit(postIt);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <PostItCard
        postIt={postIt}
        permission={postIt.userPermission}
        height={postItHeight}
        onDelete={() => onDelete(postIt.id)}
        onTogglePriority={() => onTogglePriority(postIt.id)}
        onToggleStatus={() => onToggleStatus(postIt.id)}
        onShare={() => onShare(postIt)}
        isDragging={isDragging}
        isDeleting={loadingStates[postIt.id]?.deleting}
        isTogglingPriority={loadingStates[postIt.id]?.togglingPriority}
        isTogglingStatus={loadingStates[postIt.id]?.togglingStatus}
        isSharing={loadingStates[postIt.id]?.sharing}
      />
    </div>
  );
};

interface PostItGridProps {
  postIts: PostIt[];
  sectionWidth?: ElementWidth;
  editMode?: boolean;
  onReorder?: (postIts: PostIt[]) => void;
  onEdit: (postIt: PostIt) => void;
  onDelete: (id: string, hardDelete?: boolean) => void;
  onTogglePriority: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onShare: (postIt: PostIt) => void;
  onRestore?: (id: string) => void;
  onEmptyTrash?: () => void;
  isLoading?: boolean;
  loadingStates?: Record<
    string,
    {
      deleting?: boolean;
      togglingPriority?: boolean;
      togglingStatus?: boolean;
      sharing?: boolean;
    }
  >;
}

export const PostItGrid: React.FC<PostItGridProps> = ({
  postIts,
  sectionWidth = 'full',
  editMode: _editMode = false,
  onReorder,
  onEdit,
  onDelete,
  onTogglePriority,
  onToggleStatus,
  onShare,
  onRestore,
  onEmptyTrash,
  isLoading = false,
  loadingStates = {},
}) => {
  const [showCollapsed, setShowCollapsed] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [activePostIt, setActivePostIt] = React.useState<PostIt | null>(null);

  const { getInterfaceConfig, updateInterfaceConfig: updateStore } = usePreferencesStore();
  const postitsConfig = getInterfaceConfig('postits');

  const saveMutation = React.useCallback(
    async (positions: Array<{ id: string; order: number; section: string }>) => {
      // Optimistic update du store
      updateStore('postits', { positions, sortBy: 'custom' });

      try {
        await updateInterfaceConfig('postits', { positions, sortBy: 'custom' });
      } catch (error) {
        console.error('Failed to save postit positions:', error);
      }
    },
    [updateStore],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const itemsPerRow = React.useMemo(() => {
    const postItWidth = 280;
    const maxItems = Math.floor(containerWidth / postItWidth);
    return Math.max(1, Math.min(maxItems, 6));
  }, [containerWidth]);

  const activeColumns = React.useMemo(() => {
    return Math.ceil(itemsPerRow / 2);
  }, [itemsPerRow]);

  const overdueColumns = React.useMemo(() => {
    return Math.floor(itemsPerRow / 2);
  }, [itemsPerRow]);

  const sortedPostIts = React.useMemo(() => {
    const customOrder = (postitsConfig as any)?.positions || [];

    // Sort function: Priority 1: isPriority, Priority 2: deadline, Priority 3: createdAt
    const sortPostItsByPriority = (postIts: PostIt[]): PostIt[] => {
      return [...postIts].sort((a, b) => {
        // Priority 1: isPriority (urgent) - priority posts come first
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;

        // Priority 2: deadline (date + time) - earlier deadlines first
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;

        // Priority 3: createdAt - newer posts first if no deadline
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    };

    // If custom order exists (user dragged), use it; otherwise use priority sort
    if (customOrder.length === 0) {
      return sortPostItsByPriority(postIts);
    }

    return [...postIts].sort((a, b) => {
      const orderA =
        customOrder.find((o: { id: string; order: number }) => o.id === a.id)?.order ?? 999;
      const orderB =
        customOrder.find((o: { id: string; order: number }) => o.id === b.id)?.order ?? 999;
      return orderA - orderB;
    });
  }, [postIts, postitsConfig]);

  const activePostIts = React.useMemo(() => {
    const filtered = sortedPostIts.filter((p) => p.status === 'en_cours' && !p.isArchived);

    // Always apply priority sorting within each status
    return [...filtered].sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;

      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sortedPostIts]);

  const overduePostIts = React.useMemo(() => {
    const filtered = sortedPostIts.filter((p) => p.status === 'depasse' && !p.isArchived);

    // Always apply priority sorting within each status
    return [...filtered].sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;

      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sortedPostIts]);

  const donePostIts = React.useMemo(() => {
    const filtered = sortedPostIts.filter((p) => p.status === 'done' && !p.isArchived);

    // Always apply priority sorting within each status
    return [...filtered].sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;

      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sortedPostIts]);

  // POC-317: Post-its archivés (corbeille)
  const archivedPostIts = React.useMemo(() => {
    const filtered = sortedPostIts.filter((p) => p.isArchived);
    return [...filtered].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [sortedPostIts]);

  // Limiter à 2 lignes maximum par COLONNE (pas par grille totale)
  const maxActiveVisible = 2 * activeColumns;
  const maxOverdueVisible = 2 * overdueColumns;
  const visibleActive = activePostIts.slice(0, showCollapsed ? undefined : maxActiveVisible);
  const visibleOverdue = overduePostIts.slice(0, showCollapsed ? undefined : maxOverdueVisible);
  const hasMoreActive = activePostIts.length > maxActiveVisible;
  const hasMoreOverdue = overduePostIts.length > maxOverdueVisible;

  const postItHeight = getPostItHeight(sectionWidth);

  const handleDragStart = (event: DragStartEvent) => {
    const postIt = sortedPostIts.find((p) => p.id === event.active.id);
    setActivePostIt(postIt || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePostIt(null);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeItem = sortedPostIts.find((p) => p.id === active.id);
    const overItem = sortedPostIts.find((p) => p.id === over.id);

    if (activeItem && overItem && activeItem.status !== overItem.status) {
      if (import.meta.env.DEV) {
        console.warn('Cannot move post-it between different status sections');
      }
      return;
    }

    const oldIndex = sortedPostIts.findIndex((p) => p.id === active.id);
    const newIndex = sortedPostIts.findIndex((p) => p.id === over.id);

    const newPostIts = [...sortedPostIts];
    const [movedItem] = newPostIts.splice(oldIndex, 1);
    newPostIts.splice(newIndex, 0, movedItem);

    const positions = newPostIts.map((postIt, index) => ({
      id: postIt.id,
      order: index,
      section: postIt.status,
    }));

    saveMutation(positions);

    if (onReorder) {
      onReorder(newPostIts);
    }
  };

  return (
    <div className="relative">
      <LoadingOverlay isLoading={isLoading} spinnerVariant="default" spinnerSize="lg" />
      <div className="space-y-8 pr-2">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          autoScroll={{ enabled: true, threshold: { x: 0.1, y: 0.15 } }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={containerRef}
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${itemsPerRow}, minmax(240px, 280px))`,
            }}
          >
            <div style={{ gridColumn: `span ${activeColumns}` }} className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--color-2-nuance-1)]">
                En cours ({activePostIts.length})
              </h3>
              <SortableContext
                items={visibleActive.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${activeColumns}, minmax(240px, 280px))`,
                  }}
                >
                  {visibleActive.map((postIt) => (
                    <SortablePostIt
                      key={postIt.id}
                      postIt={postIt}
                      postItHeight={postItHeight}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onTogglePriority={onTogglePriority}
                      onToggleStatus={onToggleStatus}
                      onShare={onShare}
                      loadingStates={loadingStates}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>

            <div style={{ gridColumn: `span ${overdueColumns}` }} className="space-y-4">
              <h3 className="text-lg font-semibold text-red-500 dark:text-red-400">
                Dépassés ({overduePostIts.length})
              </h3>
              <SortableContext
                items={visibleOverdue.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${overdueColumns}, minmax(240px, 280px))`,
                  }}
                >
                  {visibleOverdue.map((postIt) => (
                    <SortablePostIt
                      key={postIt.id}
                      postIt={postIt}
                      postItHeight={postItHeight}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onTogglePriority={onTogglePriority}
                      onToggleStatus={onToggleStatus}
                      onShare={onShare}
                      loadingStates={loadingStates}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
            {activePostIt && (
              <div className="drag-overlay-base cursor-grabbing">
                <PostItCard
                  postIt={activePostIt}
                  permission={activePostIt.userPermission}
                  height={postItHeight}
                  isDragging
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {(hasMoreActive || hasMoreOverdue) && (
          <div className="flex justify-center">
            <Button
              variant="custom"
              size="sm"
              onClick={() => setShowCollapsed(!showCollapsed)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[color-mix(in_srgb,var(--color-2-nuance-1)_15%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-2-nuance-1)_25%,transparent)] text-[var(--color-2-nuance-1)] border border-[var(--color-2-nuance-3)] transition-colors"
            >
              {showCollapsed ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Voir moins
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Voir plus (
                  {(hasMoreActive ? activePostIts.length - maxActiveVisible : 0) +
                    (hasMoreOverdue ? overduePostIts.length - maxOverdueVisible : 0)}{' '}
                  cachés)
                </>
              )}
            </Button>
          </div>
        )}

        {donePostIts.length > 0 && (
          <details className="mt-4">
            <summary
              className="cursor-pointer text-base font-medium text-[var(--color-1-nuance-1)] mb-3 hover:text-[var(--color-2-nuance-1)] transition-colors flex items-center gap-2 px-3 py-3 rounded-lg border"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-1-nuance-2) 40%, transparent)',
              }}
            >
              <ChevronDown className="w-4 h-4 transition-transform [details[open]_&]:rotate-180" />
              <span>Terminés ({donePostIts.length})</span>
            </summary>
            <div
              className="grid gap-4 mt-4"
              style={{
                gridTemplateColumns: `repeat(${itemsPerRow}, minmax(240px, 280px))`,
              }}
            >
              {donePostIts.map((postIt) => (
                <PostItCard
                  key={postIt.id}
                  postIt={postIt}
                  permission={postIt.userPermission}
                  height={postItHeight}
                  onDelete={() => onDelete(postIt.id)}
                  onTogglePriority={() => onTogglePriority(postIt.id)}
                  onToggleStatus={() => onToggleStatus(postIt.id)}
                  onShare={() => onShare(postIt)}
                  onEdit={() => onEdit(postIt)}
                  isDeleting={loadingStates[postIt.id]?.deleting}
                  isTogglingPriority={loadingStates[postIt.id]?.togglingPriority}
                  isTogglingStatus={loadingStates[postIt.id]?.togglingStatus}
                  isSharing={loadingStates[postIt.id]?.sharing}
                />
              ))}
            </div>
          </details>
        )}

        {archivedPostIts.length > 0 && (
          <details className="mt-4">
            <summary
              className="cursor-pointer text-base font-medium text-[var(--color-1-nuance-1)] mb-3 hover:text-[var(--color-2-nuance-1)] transition-colors flex items-center justify-between px-3 py-3 rounded-lg border"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-1-nuance-2) 40%, transparent)',
              }}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className="w-4 h-4 transition-transform [details[open]_&]:rotate-180" />
                <span>Corbeille ({archivedPostIts.length})</span>
              </div>
              {onEmptyTrash && archivedPostIts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEmptyTrash();
                  }}
                  className="!text-red-600 hover:!text-red-800 hover:!bg-red-100 hover:!border-red-300 !p-1 !h-auto !min-h-0"
                  tooltipText="Vider la corbeille"
                />
              )}
            </summary>
            <div
              className="grid gap-4 mt-4"
              style={{
                gridTemplateColumns: `repeat(${itemsPerRow}, minmax(240px, 280px))`,
              }}
            >
              {archivedPostIts.map((postIt) => (
                <PostItCard
                  key={postIt.id}
                  postIt={postIt}
                  permission={postIt.userPermission}
                  height={postItHeight}
                  isInTrash
                  onDelete={() => onDelete(postIt.id, true)}
                  onRestore={onRestore ? () => onRestore(postIt.id) : undefined}
                  isDeleting={loadingStates[postIt.id]?.deleting}
                  isTogglingStatus={loadingStates[postIt.id]?.togglingStatus}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};
