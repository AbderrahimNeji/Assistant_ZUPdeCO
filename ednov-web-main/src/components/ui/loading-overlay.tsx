import * as React from 'react';
import { Spinner } from './spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl';
  spinnerVariant?: 'default' | 'dots' | 'pulse' | 'orbit';
  blur?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  spinnerSize = 'lg',
  spinnerVariant = 'default',
  blur = 'sm',
  className,
}) => {
  if (!isLoading) return null;

  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
  };

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center',
        'bg-background/60',
        blurClasses[blur],
        'transition-all duration-200',
        className,
      )}
    >
      <Spinner variant={spinnerVariant} size={spinnerSize} label={message} />
    </div>
  );
};
