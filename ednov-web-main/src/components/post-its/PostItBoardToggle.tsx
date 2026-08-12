import * as React from 'react';
import { User, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type PostItBoardView = 'personal' | 'assigned';

interface PostItBoardToggleProps {
  view: PostItBoardView;
  onChange: (view: PostItBoardView) => void;
  className?: string;
}

export const PostItBoardToggle: React.FC<PostItBoardToggleProps> = ({
  view,
  onChange,
  className,
}) => {
  return (
    <div className={cn('view-toggle-container', className)}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'view-toggle-button',
                view === 'personal' && 'view-toggle-button-active',
              )}
              onClick={() => onChange('personal')}
              aria-label="Mes post-its"
            >
              <User className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mes post-its</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'view-toggle-button',
                view === 'assigned' && 'view-toggle-button-active',
              )}
              onClick={() => onChange('assigned')}
              aria-label="Post-its assignés"
            >
              <Users className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Post-its assignés</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
