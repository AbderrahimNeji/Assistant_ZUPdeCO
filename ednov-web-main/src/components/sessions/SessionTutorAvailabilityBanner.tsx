import * as React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface SessionTutorAvailabilityBannerProps {
  message: string | null;
  isChecking?: boolean;
}

/**
 * Bandeau non bloquant : indique l'état de vérification de disponibilité des tuteurs
 * après un changement de créneau (niveau 1 du feedback).
 */
export const SessionTutorAvailabilityBanner: React.FC<SessionTutorAvailabilityBannerProps> = ({
  message,
  isChecking = false,
}) => {
  if (!message) return null;

  const isConflict = !isChecking;

  return (
    <div
      className="mb-3 p-3 rounded-lg border flex items-start gap-2"
      style={
        isConflict
          ? {
              borderColor: 'rgb(var(--color-warning) / 0.4)',
              background: 'rgb(var(--color-warning) / 0.08)',
            }
          : {
              borderColor: 'var(--color-1-nuance-3)',
              background: 'color-mix(in srgb, var(--color-2-nuance-1) 6%, transparent)',
            }
      }
    >
      {isChecking ? (
        <Loader2
          className="w-4 h-4 flex-shrink-0 mt-0.5 animate-spin"
          style={{ color: 'var(--color-2-nuance-1)' }}
        />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[rgb(var(--color-warning))]" />
      )}
      <p
        className="text-sm"
        style={{
          color: isConflict ? 'rgb(var(--color-warning))' : 'var(--color-1-nuance-1)',
        }}
      >
        {message}
      </p>
    </div>
  );
};
