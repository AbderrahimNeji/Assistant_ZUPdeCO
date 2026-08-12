import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  colorClass?: string;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'colored';
  className?: string;
  ariaLabel?: string;
}

export const Tabs = <T extends string = string>({
  items,
  activeTab,
  onTabChange,
  size = 'md',
  variant = 'default',
  className,
  ariaLabel,
}: TabsProps<T>) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [showNavigation] = React.useState(true); // Temporairement toujours true

  const checkScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    const targetScroll =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  const handleTabClick = (tabId: T, disabled?: boolean) => {
    if (!disabled) {
      onTabChange(tabId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: T, disabled?: boolean) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onTabChange(tabId);
      }
    }
  };

  return (
    <div className={cn('tabs-wrapper', className)}>
      <div
        ref={scrollContainerRef}
        className={cn('tabs-container', `tabs-container-${size}`)}
        role="tablist"
        aria-label={ariaLabel || 'Navigation tabs'}
      >
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const tabColorClass = variant === 'colored' && item.colorClass ? item.colorClass : '';

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id, item.disabled)}
              onKeyDown={(e) => handleKeyDown(e, item.id, item.disabled)}
              className={cn(
                'tab',
                `tab-${size}`,
                tabColorClass,
                isActive && 'tab-active',
                item.disabled && 'tab-disabled',
              )}
              role="tab"
              aria-selected={isActive}
              aria-disabled={item.disabled}
              disabled={item.disabled}
              type="button"
              tabIndex={isActive ? 0 : -1}
            >
              {item.icon && <span className="tab-icon">{item.icon}</span>}
              <span className="tab-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      {showNavigation && (
        <>
          <button
            type="button"
            className={cn('tabs-nav-button tabs-nav-left', !canScrollLeft && 'tabs-nav-disabled')}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Défiler vers la gauche"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={cn('tabs-nav-button tabs-nav-right', !canScrollRight && 'tabs-nav-disabled')}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Défiler vers la droite"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

Tabs.displayName = 'Tabs';
