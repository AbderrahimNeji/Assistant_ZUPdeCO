import * as React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  variant?: 'default' | 'dots' | 'pulse' | 'orbit';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  variant = 'default',
  size = 'md',
  label,
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const sizeValue = {
    sm: 16,
    md: 32,
    lg: 48,
    xl: 64,
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex flex-col items-center justify-center', className)}>
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full spinner-dot',
                size === 'sm' && 'h-2 w-2',
                size === 'md' && 'h-3 w-3',
                size === 'lg' && 'h-4 w-4',
                size === 'xl' && 'h-5 w-5',
              )}
              style={{
                animation: 'bounce-dots 1.4s infinite ease-in-out',
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
        {label && <p className={cn('spinner-text', `spinner-text-${size}`)}>{label}</p>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex flex-col items-center justify-center', className)}>
        <div className={cn('relative flex items-center justify-center', sizeClasses[size])}>
          <div
            className="absolute inset-0 rounded-full spinner-pulse-ring opacity-75"
            style={{
              animation: 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <div
            className="absolute inset-0 rounded-full spinner-pulse-ring opacity-75"
            style={{
              animation: 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              animationDelay: '0.75s',
            }}
          />
          <div className="relative rounded-full spinner-pulse-center h-1/2 w-1/2" />
        </div>
        {label && <p className={cn('spinner-text', `spinner-text-${size}`)}>{label}</p>}
      </div>
    );
  }

  if (variant === 'orbit') {
    const orbitSize = sizeValue[size];
    const dotSize = Math.max(4, orbitSize / 8);

    return (
      <div className={cn('flex flex-col items-center justify-center', className)}>
        <div className={cn('relative', sizeClasses[size])}>
          <div className="absolute inset-0 flex items-center justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  animation: 'spin-orbit 1.2s linear infinite',
                  animationDelay: `${i * 0.4}s`,
                }}
              >
                <div
                  className="rounded-full spinner-orbit-dot"
                  style={{
                    width: `${dotSize}px`,
                    height: `${dotSize}px`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        {label && <p className={cn('spinner-text', `spinner-text-${size}`)}>{label}</p>}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <div
          className="absolute inset-0 rounded-full border-[3px] border-transparent spinner-border-primary"
          style={{
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div
          className="absolute inset-[6px] rounded-full border-[2px] border-transparent spinner-border-secondary opacity-60"
          style={{
            animation: 'spin 1.2s linear infinite reverse',
          }}
        />
        <div
          className="absolute inset-[12px] rounded-full spinner-center-pulse opacity-20"
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      </div>
      {label && <p className={cn('spinner-text', `spinner-text-${size}`)}>{label}</p>}
    </div>
  );
};
