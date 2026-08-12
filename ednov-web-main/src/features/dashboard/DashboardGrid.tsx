import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatCard } from '@/components/cards/StatCard';
import { Button } from '@/components/forms/Button';
import { Eye, EyeOff, GripVertical, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CardConfig {
  id: string;
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  visible: boolean;
  order: number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface DashboardGridProps {
  cards: CardConfig[];
  onReorder: (cards: CardConfig[]) => void;
  editMode: boolean;
  onToggleCard: (cardId: string) => void;
  onCardClick?: (cardId: string) => void;
  className?: string;
}

interface SortableCardProps {
  card: CardConfig;
  editMode: boolean;
  onToggle: () => void;
  onClick?: () => void;
}

const SortableCard: React.FC<SortableCardProps> = ({ card, editMode, onToggle, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !editMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: editMode && !card.visible ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative', isDragging && 'z-50', editMode && 'cursor-move')}
    >
      {editMode && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            size="sm"
            variant={card.visible ? 'secondary' : 'primary'}
            icon={card.visible ? EyeOff : Eye}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="h-8 w-8 p-0"
          />
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center h-8 w-8 rounded-md bg-muted cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </div>
      )}
      <StatCard
        {...card}
        onClick={!editMode && onClick ? () => onClick() : undefined}
        className={cn(
          editMode && 'pointer-events-none select-none',
          !card.visible && editMode && 'border-dashed',
        )}
      />
    </div>
  );
};

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  cards,
  onReorder,
  editMode,
  onToggleCard,
  onCardClick,
  className,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((card) => card.id === active.id);
      const newIndex = cards.findIndex((card) => card.id === over.id);

      const reorderedCards = arrayMove(cards, oldIndex, newIndex).map((card, index) => ({
        ...card,
        order: index,
      }));

      onReorder(reorderedCards);
    }
  };

  // Sort cards by order and separate visible/hidden in edit mode
  const sortedCards = React.useMemo(() => {
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    if (editMode) {
      const visible = sorted.filter((c) => c.visible);
      const hidden = sorted.filter((c) => !c.visible);
      return [...visible, ...hidden];
    }
    return sorted.filter((c) => c.visible);
  }, [cards, editMode]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedCards.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
          {sortedCards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              editMode={editMode}
              onToggle={() => onToggleCard(card.id)}
              onClick={onCardClick ? () => onCardClick(card.id) : undefined}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
