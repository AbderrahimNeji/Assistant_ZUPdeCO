import * as React from 'react';
import { List, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/types/data-table.types';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange, className }) => {
  return (
    <div className={cn('view-toggle-container', className)}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn('view-toggle-button', mode === 'list' && 'view-toggle-button-active')}
              onClick={() => onChange('list')}
              aria-label="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Vue liste</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn('view-toggle-button', mode === 'cards' && 'view-toggle-button-active')}
              onClick={() => onChange('cards')}
              aria-label="Vue cartes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Vue cartes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
