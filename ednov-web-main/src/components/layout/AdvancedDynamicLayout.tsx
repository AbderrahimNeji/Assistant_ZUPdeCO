import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { InterfaceElement } from '@/types/interface-elements.types';
import { calculateOptimalLayout, getResponsiveColumnSpan } from '@/utils/layout-calculator';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface AdvancedDynamicLayoutProps {
  elements: InterfaceElement[];
  renderElement: (element: InterfaceElement) => React.ReactNode;
  onReorder?: (elements: InterfaceElement[]) => void;
  editMode?: boolean;
  className?: string;
}

interface SortableElementWrapperProps {
  element: InterfaceElement;
  children: React.ReactNode;
  editMode: boolean;
  columnSpan: string;
}

const SortableElementWrapper: React.FC<SortableElementWrapperProps> = ({
  element,
  children,
  editMode,
  columnSpan,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
    disabled: !editMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        columnSpan,
        'relative',
        isDragging && 'z-50 opacity-50',
        editMode && 'cursor-move',
      )}
      data-element-id={element.elementId}
      data-element-type={element.elementType}
    >
      {editMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-10 flex items-center justify-center h-8 w-8 rounded-md bg-primary-bg/10 hover:bg-primary-hover/20 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={cn(editMode && 'pointer-events-none')}>{children}</div>
    </div>
  );
};

export const AdvancedDynamicLayout: React.FC<AdvancedDynamicLayoutProps> = ({
  elements,
  renderElement,
  onReorder,
  editMode = false,
  className,
}) => {
  const [orderedElements, setOrderedElements] = React.useState(elements);
  const [activeId, setActiveId] = React.useState<string | null>(null);

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

  // Update when elements prop changes
  React.useEffect(() => {
    setOrderedElements(elements);
  }, [elements]);

  const layout = React.useMemo(() => calculateOptimalLayout(orderedElements), [orderedElements]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setOrderedElements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update order property
        const withUpdatedOrder = reordered.map((item, index) => ({
          ...item,
          userOrder: index,
        }));

        // Notify parent
        if (onReorder) {
          onReorder(withUpdatedOrder);
        }

        return withUpdatedOrder;
      });
    }
  };

  const activeElement = activeId ? orderedElements.find((el) => el.id === activeId) : null;

  if (orderedElements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No elements to display
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedElements.map((el) => el.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={cn(
            'grid gap-4',
            `grid-cols-${layout.responsive.sm}`,
            `md:grid-cols-${layout.responsive.md}`,
            `lg:grid-cols-${layout.responsive.lg}`,
            `xl:grid-cols-${layout.responsive.xl}`,
            className,
          )}
        >
          {orderedElements.map((element) => {
            const columnSpan = getResponsiveColumnSpan(element.width ?? 'auto', layout);

            return (
              <SortableElementWrapper
                key={element.id}
                element={element}
                editMode={editMode}
                columnSpan={columnSpan}
              >
                {renderElement(element)}
              </SortableElementWrapper>
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeElement ? (
          <div className="opacity-80 shadow-2xl">{renderElement(activeElement)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
