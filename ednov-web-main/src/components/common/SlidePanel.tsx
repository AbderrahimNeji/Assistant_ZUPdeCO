import * as React from 'react';
import { cn } from '@/lib/utils';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  slideDirection?: 'left' | 'right';
}

export const SlidePanel: React.FC<SlidePanelProps> = ({
  isOpen,
  onClose,
  children,
  slideDirection = 'right',
}) => {
  const [shouldRender, setShouldRender] = React.useState(isOpen);

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <button
        className="slide-panel-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-label="Fermer le panneau"
        type="button"
        style={{
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 200ms var(--ease-out)',
        }}
      />
      <div
        className={cn(
          'slide-panel',
          slideDirection === 'left' ? 'slide-panel-left' : 'slide-panel-right',
          isOpen && 'open',
        )}
      >
        <div className="slide-panel-content">{children}</div>
      </div>
    </>
  );
};
