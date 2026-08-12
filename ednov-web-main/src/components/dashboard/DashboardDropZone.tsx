import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ArrowDown, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneContentProps {
  label: string;
  icon: React.ReactNode;
  isOver: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const DropZoneContent: React.FC<DropZoneContentProps> = ({
  label,
  icon,
  isOver,
  className,
  style,
}) => (
  <div
    className={cn(
      'w-full rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2',
      isOver
        ? 'border-[var(--color-2-nuance-1)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]'
        : 'border-[color-mix(in_srgb,var(--color-2-nuance-1)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-2-nuance-1)_4%,transparent)]',
      className,
    )}
    style={style}
  >
    <span
      className={cn(
        'transition-colors duration-200',
        isOver
          ? 'text-[var(--color-2-nuance-1)]'
          : 'text-[color-mix(in_srgb,var(--color-2-nuance-1)_50%,transparent)]',
      )}
    >
      {icon}
    </span>
    <span
      className={cn(
        'font-medium text-sm transition-colors duration-200',
        isOver
          ? 'text-[var(--color-2-nuance-1)]'
          : 'text-[color-mix(in_srgb,var(--color-2-nuance-1)_50%,transparent)]',
      )}
    >
      {label}
    </span>
  </div>
);

export const DropZoneBetweenRows: React.FC<{ afterRowIdx: number; visible: boolean }> = ({
  afterRowIdx,
  visible,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-zone-after-row-${afterRowIdx}` });

  if (!visible) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn('col-span-12 transition-all duration-200', isOver ? 'h-24' : 'h-16')}
    >
      <DropZoneContent
        label="Déposer ici"
        icon={<ArrowDown className="w-4 h-4" />}
        isOver={isOver}
        className="h-full"
      />
    </div>
  );
};

export const SourceRowPlaceholder: React.FC<{ height: number }> = ({ height }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'source-row-placeholder' });

  return (
    <div ref={setNodeRef} className="col-span-12">
      <DropZoneContent
        label="Ramener ici"
        icon={<Undo2 className="w-4 h-4" />}
        isOver={isOver}
        style={{ height: `${height}px` }}
      />
    </div>
  );
};

export const InlineDropPlaceholder: React.FC<{ height: number }> = ({ height }) => (
  <DropZoneContent
    label="Ramener ici"
    icon={<Undo2 className="w-4 h-4" />}
    isOver={true}
    style={{ height: `${height}px` }}
  />
);
