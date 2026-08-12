import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const THEME_TOGGLE_ANIM_MS = 360;
const THEME_TOGGLE_ADVANCE_MS = 22;

interface ThemeToggleProps {
  collapsed: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ collapsed }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const endSwitch = React.useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    toggleTheme();
    setIsAnimating(false);
  }, [toggleTheme]);

  const handleClick = () => {
    if (isAnimating) return;

    const reduceMotion =
      typeof globalThis !== 'undefined' &&
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    if (reduceMotion) {
      toggleTheme();
      return;
    }

    finishedRef.current = false;
    setIsAnimating(true);
    const delayMs = Math.max(0, THEME_TOGGLE_ANIM_MS - THEME_TOGGLE_ADVANCE_MS);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      endSwitch();
    }, delayMs);
  };

  const goingToDark = !isDarkMode;
  const showMoonSpin = isAnimating && goingToDark;
  const showSunSpin = isAnimating && isDarkMode;

  const buttonContent = (
    <button
      type="button"
      onClick={handleClick}
      disabled={isAnimating}
      aria-busy={isAnimating}
      className={cn('sidebar-action-button', collapsed ? 'w-full justify-center' : 'w-full')}
      aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      {isDarkMode ? (
        <Sun
          className={cn('sidebar-action-icon', showSunSpin && 'theme-toggle-sun-click-spin')}
          size={20}
          aria-hidden
        />
      ) : (
        <Moon
          className={cn('sidebar-action-icon', showMoonSpin && 'theme-toggle-moon-click-roll')}
          size={20}
          aria-hidden
        />
      )}

      {!collapsed && (
        <span className="text-sm font-medium">{isDarkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{isDarkMode ? 'Mode Clair' : 'Mode Sombre'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
};
