import * as React from 'react';
import { useSortable, defaultAnimateLayoutChanges } from '@dnd-kit/sortable';
import type { AnimateLayoutChanges } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { GripVertical, Maximize2, Minimize2, Plus, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/forms/Button';
import { cn } from '@/lib/utils';
import type { ElementWidth } from '@/types/interface-elements.types';

export type SectionWidth = ElementWidth;

interface SectionProps {
  id: string;
  globalEditMode: boolean;
  isDraggingAny?: boolean;
  width?: SectionWidth;
  previewMode?: boolean;
  dropIndicator?: 'left' | 'middle' | 'right' | null;
  rowSectionCount?: number;
  onResize?: (width: SectionWidth) => void;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  children: React.ReactNode;
  className?: string;
}

const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args;
  if (isSorting || wasDragging) {
    return false;
  }
  return defaultAnimateLayoutChanges(args);
};

export const Section: React.FC<SectionProps> = ({
  id,
  globalEditMode,
  isDraggingAny = false,
  width = 'full',
  previewMode = false,
  dropIndicator = null,
  rowSectionCount = 1,
  onResize,
  isVisible = true,
  onToggleVisibility,
  children,
  className,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id,
    disabled: !globalEditMode,
    animateLayoutChanges,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `section-${id}`,
    disabled: !globalEditMode,
  });

  // Combiner les deux refs
  const combinedRef = React.useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      setDroppableRef(node);
    },
    [setNodeRef, setDroppableRef],
  );

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
  };

  const widthClasses: Record<SectionWidth, string> = {
    '1/3': 'lg:col-span-4',
    '1/2': 'lg:col-span-6',
    '2/3': 'lg:col-span-8',
    full: 'lg:col-span-12',
    auto: 'lg:col-span-auto',
  };

  // Adapter les options de largeur selon le contexte de la rangee
  const getWidthOptions = (): SectionWidth[] => {
    if (rowSectionCount === 1) {
      // 1 section: toujours full, pas de resize
      return [];
    } else if (rowSectionCount === 2) {
      // 2 sections: cycler entre 1/3, 1/2, 2/3
      return ['1/3', '1/2', '2/3'];
    } else {
      // 3+ sections: toujours 1/3, pas de resize
      return [];
    }
  };

  const widthOptions = getWidthOptions();
  const canResize = widthOptions.length > 0;

  const cycleWidth = () => {
    if (!onResize || !canResize) return;
    const currentIndex = widthOptions.indexOf(width);
    const nextIndex = (currentIndex + 1) % widthOptions.length;
    onResize(widthOptions[nextIndex]);
  };

  return (
    <div
      className={cn(
        'relative col-span-12 h-full',
        widthClasses[width],
        globalEditMode && 'overflow-visible pt-4',
      )}
    >
      {/* Drop indicator - LEFT */}
      {dropIndicator === 'left' && <div className="drop-indicator drop-indicator-left" />}

      {/* Drop indicator - MIDDLE (pour ligne de 2 éléments) */}
      {dropIndicator === 'middle' && <div className="drop-indicator drop-indicator-right" />}

      {/* Drop indicator - RIGHT */}
      {dropIndicator === 'right' && <div className="drop-indicator drop-indicator-right" />}

      <div
        ref={combinedRef}
        style={style}
        {...(globalEditMode ? { ...attributes, ...listeners } : {})}
        className={cn(
          'dashboard-section h-full overflow-visible',
          globalEditMode &&
            'dashboard-section-edit-mode drop-zone-active cursor-grab active:cursor-grabbing',
          isDragging && 'dashboard-section-dragging dragging-element',
          previewMode && 'dashboard-section-preview',
          isOver && 'ring-2 ring-[var(--color-2-nuance-1)]',
          !isVisible && globalEditMode && 'dashboard-section-hidden',
          className,
        )}
      >
        {/* Drag indicator - visual cue in edit mode */}
        {globalEditMode && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="dashboard-section-drag-handle">
              <GripVertical className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Resize Button - positioned on right edge, centered vertically */}
        {globalEditMode && onResize && (
          <div className="dashboard-section-resize-button-container">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    icon={width === 'full' ? Minimize2 : Maximize2}
                    iconOnly
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleWidth();
                    }}
                    disabled={!canResize}
                    className="section-resize-button !rounded-full !border-2"
                  />
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>
                    {canResize && `Largeur: ${width}`}
                    {!canResize && rowSectionCount === 1 && 'Pleine largeur (1 section)'}
                    {!canResize && rowSectionCount !== 1 && 'Largeur fixe (3+ sections)'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Visibility Button - positioned on left edge, centered vertically */}
        {globalEditMode && onToggleVisibility && (
          <div className="dashboard-section-visibility-button-container">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    icon={isVisible ? Minus : Plus}
                    iconOnly
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility();
                    }}
                    className="section-visibility-button !rounded-full !border-2"
                  />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{isVisible ? 'Masquer la section' : 'Afficher la section'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Section content wrapper with interaction blocking */}
        <div className={cn('section-content', isDraggingAny && 'dragging-any')}>{children}</div>

        {/* Overlay transparent pour bloquer 100% des interactions pendant le drag */}
        {isDraggingAny && <div className="section-interaction-blocker" />}
      </div>

      {/* Banner "section cachée" — sibling du div opaque, hérite PAS de son opacity */}
      {!isVisible && globalEditMode && (
        <div className="dashboard-section-hidden-banner">
          <div className="dashboard-section-hidden-banner-label">
            <span>Cliquer sur</span>
            <Minus className="dashboard-section-hidden-banner-icon" />
            <span>pour afficher la section</span>
          </div>
        </div>
      )}
    </div>
  );
};
