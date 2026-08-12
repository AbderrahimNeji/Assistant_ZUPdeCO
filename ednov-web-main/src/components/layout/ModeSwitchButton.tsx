import * as React from 'react';
import { Monitor, Wifi } from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';
import { cn } from '@/lib/utils';

/**
 * Visible only for users with hybrid roles.
 * Toggles between in_person (présentiel) and remote (distanciel) modes.
 *
 * The button is intentionally minimal — full styling will be added when the
 * distanciel module is built. For now it renders nothing for non-hybrid users.
 */
export const ModeSwitchButton: React.FC = () => {
  const { mode, setMode, canSwitchMode } = useMode();

  if (!canSwitchMode) return null;

  const isRemote = mode === 'remote';

  return (
    <button
      type="button"
      aria-label={isRemote ? 'Passer en mode présentiel' : 'Passer en mode distanciel'}
      title={
        isRemote
          ? 'Mode distanciel actif — cliquer pour présentiel'
          : 'Mode présentiel actif — cliquer pour distanciel'
      }
      onClick={() => setMode(isRemote ? 'in_person' : 'remote')}
      className={cn(
        'mode-switch-btn',
        isRemote ? 'mode-switch-btn--remote' : 'mode-switch-btn--in-person',
      )}
    >
      {isRemote ? (
        <Wifi className="mode-switch-btn__icon" aria-hidden />
      ) : (
        <Monitor className="mode-switch-btn__icon" aria-hidden />
      )}
      <span className="mode-switch-btn__label">{isRemote ? 'Distanciel' : 'Présentiel'}</span>
    </button>
  );
};
