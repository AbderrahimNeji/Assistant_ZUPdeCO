import * as React from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Level } from '@/types/level.types';
import { cn } from '@/lib/utils';

export const NEW_LEVEL_PLACEHOLDER_ID = '__new__';

// ─── Item data ──────────────────────────────────────────────────────────────

interface SortableItemData {
  id: string;
  code: string;
  label: string;
  isPlaceholder?: boolean;
}

// ─── Sortable item ──────────────────────────────────────────────────────────

const SortableItem: React.FC<{ item: SortableItemData; isCurrent: boolean }> = ({
  item,
  isCurrent,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
        isCurrent
          ? 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)] border-[var(--color-2-nuance-1)]'
          : 'bg-card border-border hover:bg-muted/40',
        item.isPlaceholder && 'border-dashed',
        isDragging && 'shadow-lg',
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
        aria-label="Déplacer"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {item.code && (
          <span className="font-mono text-xs text-muted-foreground shrink-0">{item.code}</span>
        )}
        <span
          className={cn(
            'text-sm truncate',
            isCurrent ? 'font-semibold text-foreground' : 'text-foreground',
            item.isPlaceholder && 'italic text-muted-foreground',
          )}
        >
          {item.label}
        </span>
        {isCurrent && !item.isPlaceholder && (
          <span className="text-xs text-[var(--color-2-nuance-1)] font-medium shrink-0">
            (en cours)
          </span>
        )}
        {item.isPlaceholder && (
          <span className="text-xs text-[var(--color-2-nuance-1)] font-medium shrink-0">
            (nouveau)
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Main list ──────────────────────────────────────────────────────────────

interface LevelSortableListProps {
  allLevels: Level[];
  /**
   * ID du niveau en cours d'édition, ou NEW_LEVEL_PLACEHOLDER_ID pour la création.
   */
  currentLevelId: string;
  /**
   * Libellé live du nouveau niveau (utilisé uniquement en mode création).
   */
  newLevelLabel?: string;
  /**
   * Appelé à chaque réorganisation avec la liste ordonnée des IDs
   * (peut inclure NEW_LEVEL_PLACEHOLDER_ID en mode création).
   */
  onOrderChange: (orderedIds: string[]) => void;
}

export const LevelSortableList: React.FC<LevelSortableListProps> = ({
  allLevels,
  currentLevelId,
  newLevelLabel,
  onOrderChange,
}) => {
  const isCreate = currentLevelId === NEW_LEVEL_PLACEHOLDER_ID;

  const buildItems = React.useCallback(
    (levels: Level[]): SortableItemData[] => {
      const existing: SortableItemData[] = levels.map((l) => ({
        id: l.id,
        code: l.code,
        label: l.label,
      }));
      if (isCreate) {
        return [
          ...existing,
          {
            id: NEW_LEVEL_PLACEHOLDER_ID,
            code: '',
            label: newLevelLabel?.trim() || 'Nouveau niveau',
            isPlaceholder: true,
          },
        ];
      }
      return existing;
    },
    [isCreate, newLevelLabel],
  );

  const [items, setItems] = React.useState<SortableItemData[]>(() => buildItems(allLevels));

  React.useEffect(() => {
    setItems(buildItems(allLevels));
  }, [allLevels, buildItems]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((l) => l.id === active.id);
      const newIndex = prev.findIndex((l) => l.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      onOrderChange(reordered.map((l) => l.id));
      return reordered;
    });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {items.map((item) => (
            <SortableItem key={item.id} item={item} isCurrent={item.id === currentLevelId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
