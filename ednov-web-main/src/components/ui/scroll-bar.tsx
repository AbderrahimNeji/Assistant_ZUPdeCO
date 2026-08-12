import * as React from 'react';
import { cn } from '@/lib/utils';

interface ScrollBarProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  maxWidth?: string;
  orientation?: 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const ScrollBar: React.FC<ScrollBarProps> = ({
  children,
  className,
  maxHeight,
  maxWidth,
  orientation = 'vertical',
  style,
  onScroll,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleWheel = React.useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const element = scrollRef.current;
      if (!element) return;

      if (orientation === 'vertical') {
        const isAtTop = element.scrollTop === 0;
        const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

        if ((e.deltaY < 0 && !isAtTop) || (e.deltaY > 0 && !isAtBottom)) {
          e.stopPropagation();
        }
      } else {
        const isAtLeft = element.scrollLeft === 0;
        const isAtRight = element.scrollWidth - element.scrollLeft === element.clientWidth;

        if ((e.deltaX < 0 && !isAtLeft) || (e.deltaX > 0 && !isAtRight)) {
          e.stopPropagation();
        }
      }
    },
    [orientation],
  );

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      onScroll={onScroll}
      className={cn(
        orientation === 'vertical' ? 'custom-scroll-area' : 'custom-scroll-area-horizontal',
        className,
      )}
      style={{
        maxHeight: orientation === 'vertical' ? maxHeight || '100%' : undefined,
        maxWidth: orientation === 'horizontal' ? maxWidth : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
