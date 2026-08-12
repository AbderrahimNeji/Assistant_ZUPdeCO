import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { ElementWidth } from '@/types/interface-elements.types';

interface DropZoneProps {
  id: string;
  visible: boolean;
  targetWidth?: ElementWidth;
}

const getWidthClass = (width: ElementWidth | undefined): string => {
  switch (width) {
    case 'full':
      return 'w-full';
    case '2/3':
      return 'w-2/3';
    case '1/2':
      return 'w-1/2';
    case '1/3':
      return 'w-1/3';
    default:
      return 'w-[80px]';
  }
};

export const DropZone: React.FC<DropZoneProps> = ({ id, visible, targetWidth }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  if (!visible) return null;

  // Déterminer si c'est une dropzone inline (dans une ligne) ou nouvelle ligne
  const isInlineZone = id.startsWith('drop-zone-row-');

  // Pour les dropzones inline : ne s'afficher que si isOver
  // Pour les dropzones nouvelle ligne : toujours visibles (mais géré par DropZoneBetweenRows)
  if (isInlineZone && !isOver) {
    // Rendre un placeholder invisible mais qui peut recevoir les events
    return (
      <div
        ref={setNodeRef}
        className="w-4 h-full opacity-0 pointer-events-auto"
        style={{ pointerEvents: 'auto' }}
      />
    );
  }

  const widthClass = targetWidth ? getWidthClass(targetWidth) : 'w-[80px]';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-all duration-200',
        'flex flex-col items-center justify-center',
        'h-full min-h-[200px]',
        widthClass,
        'bg-[var(--color-2-nuance-1)]/15 border-2 border-dashed border-[var(--color-2-nuance-1)]',
        'rounded-xl',
        'cursor-pointer',
        'z-40',
        'shadow-lg',
        'p-6',
      )}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Icône de drop */}
      <div className="w-12 h-12 rounded-full bg-[var(--color-2-nuance-1)]/25 flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-[var(--color-2-nuance-1)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>

      {/* Texte */}
      <span className="text-sm font-semibold text-[var(--color-2-nuance-1)] animate-pulse">
        DROP
      </span>
      <span className="text-xs text-[var(--color-2-nuance-1)]/70 mt-1">Placer ici</span>
    </div>
  );
};
