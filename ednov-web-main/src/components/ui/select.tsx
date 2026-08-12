import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn('modern-select-trigger', '[&>span]:line-clamp-1', className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="modern-select-chevron" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

// Contexte pour partager la ref du viewport avec les boutons de scroll custom
const SelectViewportContext = React.createContext<React.RefObject<HTMLDivElement | null> | null>(
  null,
);

// Hook : visibilité d'un bouton de scroll selon la position actuelle du viewport
function useScrollButtonVisible(
  direction: 'up' | 'down',
  viewportRef: React.RefObject<HTMLDivElement | null>,
) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const check = () => {
      if (direction === 'up') {
        setVisible(el.scrollTop > 1);
      } else {
        setVisible(el.scrollTop < el.scrollHeight - el.clientHeight - 1);
      }
    };

    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [direction, viewportRef]);

  return visible;
}

// Bouton de scroll custom avec intervalle contrôlé (pas de rAF non maîtrisable)
const SlowScrollButton = ({
  direction,
  className,
}: {
  direction: 'up' | 'down';
  className?: string;
}) => {
  const viewportRef = React.useContext(SelectViewportContext);
  const visible = useScrollButtonVisible(direction, viewportRef ?? React.createRef());
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startScroll = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      viewportRef?.current?.scrollBy({ top: direction === 'down' ? 30 : -30 });
    }, 200);
  };

  const stopScroll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  React.useEffect(() => stopScroll, []);

  if (!viewportRef || !visible) return null;

  return (
    <button
      type="button"
      tabIndex={-1}
      className={cn(
        'flex cursor-default select-none items-center justify-center py-1.5 w-full',
        direction === 'up'
          ? 'bg-gradient-to-b from-popover to-transparent'
          : 'bg-gradient-to-t from-popover to-transparent',
        className,
      )}
      onMouseEnter={startScroll}
      onMouseLeave={stopScroll}
      onPointerDown={stopScroll}
    >
      {direction === 'up' ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
};

// Gardés pour compatibilité avec les exports existants
const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-2',
      'bg-gradient-to-b from-popover to-transparent',
      className,
    )}
    {...props}
  >
    <ChevronUp className="h-5 w-5 text-muted-foreground" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-2',
      'bg-gradient-to-t from-popover to-transparent',
      className,
    )}
    {...props}
  >
    <ChevronDown className="h-5 w-5 text-muted-foreground" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <SelectViewportContext.Provider value={viewportRef}>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            'modern-dropdown-content',
            'radix-dropdown-content',
            'relative z-[1200] min-w-[8rem] overflow-hidden',
            'origin-[--radix-select-content-transform-origin]',
            position === 'popper' &&
              'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
            className,
          )}
          position={position}
          sideOffset={4}
          {...props}
        >
          <SlowScrollButton direction="up" />
          <SelectPrimitive.Viewport
            ref={viewportRef}
            className={cn(
              'modern-dropdown-viewport',
              'overflow-y-auto',
              position === 'popper' &&
                'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SlowScrollButton direction="down" />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectViewportContext.Provider>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'modern-dropdown-item',
      'pl-9',
      'data-[state=checked]:modern-dropdown-item-selected',
      className,
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-5 w-5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-5 w-5" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText className="modern-select-value">{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
