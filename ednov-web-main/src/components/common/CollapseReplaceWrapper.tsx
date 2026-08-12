import * as React from 'react';
import { cn } from '@/lib/utils';

export type CollapseReplaceMode = 'replace' | 'collapse';

interface CollapseReplaceWrapperProps {
  mode: CollapseReplaceMode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  formContent: React.ReactNode;
  collapsePosition?: 'top' | 'bottom';
}

export const CollapseReplaceWrapper: React.FC<CollapseReplaceWrapperProps> = ({
  mode,
  isOpen,
  children,
  formContent,
  collapsePosition = 'top',
}) => {
  switch (mode) {
    case 'replace':
      return <>{isOpen ? formContent : children}</>;

    case 'collapse':
      return (
        <div className="space-y-0">
          {collapsePosition === 'top' && (
            <div
              className={cn(
                'collapse-container',
                isOpen ? 'collapse-enter-active' : 'collapse-exit-active',
              )}
            >
              {isOpen && <div className="collapse-content collapse-content-top">{formContent}</div>}
            </div>
          )}

          <div
            className={cn(
              'transition-all duration-400',
              isOpen && collapsePosition === 'top' && 'animate-slide-down',
            )}
          >
            {children}
          </div>

          {collapsePosition === 'bottom' && (
            <div
              className={cn(
                'collapse-container',
                isOpen ? 'collapse-enter-active' : 'collapse-exit-active',
              )}
            >
              {isOpen && (
                <div className="collapse-content collapse-content-bottom">{formContent}</div>
              )}
            </div>
          )}
        </div>
      );

    default:
      return <>{children}</>;
  }
};
