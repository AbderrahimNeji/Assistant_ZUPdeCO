import * as React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  fallback?: string;
  gender?: 'male' | 'female' | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getGenderColor = (gender?: 'male' | 'female' | null): string => {
  if (gender === 'male')
    return 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_20%,transparent)] text-[var(--color-2-nuance-1)]';
  if (gender === 'female')
    return 'bg-[color-mix(in_srgb,var(--color-3-nuance-1)_20%,transparent)] text-[var(--color-3-nuance-1)]';
  return 'bg-[color-mix(in_srgb,var(--color-1-nuance-1)_20%,transparent)] text-[var(--color-1-nuance-1)]';
};

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  fallback,
  gender,
  size = 'md',
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={fallback || 'Avatar'}
        className={cn(
          'rounded-full object-cover border-2 border-[var(--color-1-nuance-3)]',
          sizeClasses[size],
          className,
        )}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold border-2 border-[var(--color-1-nuance-3)]',
        sizeClasses[size],
        getGenderColor(gender),
        className,
      )}
    >
      {fallback ? (
        <span>{fallback}</span>
      ) : (
        <User
          className={cn(
            size === 'sm' && 'w-4 h-4',
            size === 'md' && 'w-6 h-6',
            size === 'lg' && 'w-8 h-8',
          )}
        />
      )}
    </div>
  );
};
